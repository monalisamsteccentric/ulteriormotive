-- Additive migration for the EXISTING woyxnowfyhiedyplcspb project.
-- Keep 001 and all existing JSON records. CAS remains the transaction coordinator;
-- relational records are maintained in the SAME transaction, never by a second API write.
BEGIN;
CREATE TABLE public.um_profiles (
 id uuid PRIMARY KEY, email text NOT NULL UNIQUE, display_name text NOT NULL
);
CREATE TABLE public.um_matches (
 id uuid PRIMARY KEY, host_id uuid NOT NULL REFERENCES public.um_profiles(id),
 title text NOT NULL, topic text NOT NULL,
 opponent text NOT NULL CHECK(opponent IN ('human','practice','ollama','ai')),
 human_seat text CHECK(human_seat IN ('a','b')),
 status text NOT NULL CHECK(status IN ('waiting','live','voting','finished')),
 created_at timestamptz NOT NULL, voting_ends_at timestamptz,
 CHECK((opponent = 'ai') = (human_seat IS NOT NULL))
);
CREATE INDEX um_matches_lobby ON public.um_matches(status, created_at DESC);
CREATE TABLE public.um_participants (
 match_id uuid NOT NULL REFERENCES public.um_matches(id), seat text NOT NULL CHECK(seat IN ('a','b')),
 user_id uuid REFERENCES public.um_profiles(id), kind text NOT NULL CHECK(kind IN ('human','ai','script')),
 PRIMARY KEY(match_id,seat), UNIQUE(match_id,user_id), CHECK((kind = 'human') = (user_id IS NOT NULL))
);
CREATE TABLE public.um_messages (
 match_id uuid NOT NULL, id text NOT NULL, seat text NOT NULL, body text NOT NULL CHECK(length(body) BETWEEN 1 AND 1500),
 sent_at timestamptz NOT NULL, PRIMARY KEY(match_id,id),
 FOREIGN KEY(match_id,seat) REFERENCES public.um_participants(match_id,seat)
);
CREATE INDEX um_messages_history ON public.um_messages(match_id,sent_at);
CREATE TABLE public.um_votes (
 match_id uuid NOT NULL REFERENCES public.um_matches(id), user_id uuid NOT NULL REFERENCES public.um_profiles(id),
 choice text NOT NULL CHECK(choice IN ('human','ai','a','b')), PRIMARY KEY(match_id,user_id)
);
CREATE TABLE public.um_match_results (
 match_id uuid PRIMARY KEY REFERENCES public.um_matches(id), human_seat text, correct_votes integer NOT NULL CHECK(correct_votes>=0),
 incorrect_votes integer NOT NULL CHECK(incorrect_votes>=0), winner text NOT NULL CHECK(winner IN ('audience','contender','draw','no-votes'))
);
CREATE TABLE public.um_enterprise_inquiries (
 id uuid PRIMARY KEY, name text NOT NULL, email text NOT NULL, company text NOT NULL,
 role text, business_problem text NOT NULL, requirements text, received_at timestamptz NOT NULL
);
CREATE INDEX um_inquiries_received ON public.um_enterprise_inquiries(received_at DESC);
-- No browser access, including authenticated users. All reads/writes pass through
-- the server's authorized public projection. Never publish these tables to Realtime.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['um_profiles','um_matches','um_participants','um_messages','um_votes','um_match_results','um_enterprise_inquiries'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated',t);
  EXECUTE format('GRANT SELECT ON public.%I TO service_role',t);
 END LOOP;
END $$;
CREATE FUNCTION public.um_project_state() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE u jsonb; m jsonb; msg jsonb; ballot record; q jsonb; human text; other text; correct integer; incorrect integer; right_choice text;
BEGIN
 FOR u IN SELECT value FROM jsonb_array_elements(NEW.data->'users') LOOP
  INSERT INTO public.um_profiles VALUES((u->>'id')::uuid,lower(u->>'email'),u->>'name')
  ON CONFLICT(id) DO UPDATE SET email=excluded.email,display_name=excluded.display_name;
 END LOOP;
 FOR m IN SELECT value FROM jsonb_array_elements(NEW.data->'matches') LOOP
  human := coalesce(m->>'humanSeat','a'); other := CASE WHEN human='a' THEN 'b' ELSE 'a' END;
  IF EXISTS(SELECT 1 FROM public.um_matches WHERE id=(m->>'id')::uuid AND (host_id<>(m->>'hostId')::uuid OR opponent<>m->>'opponent' OR human_seat IS DISTINCT FROM m->>'humanSeat')) THEN RAISE EXCEPTION 'Immutable match identity'; END IF;
  INSERT INTO public.um_matches VALUES((m->>'id')::uuid,(m->>'hostId')::uuid,m->>'title',m->>'topic',m->>'opponent',m->>'humanSeat',m->>'status',to_timestamp((m->>'createdAt')::double precision/1000),to_timestamp((m->>'votingEndsAt')::double precision/1000))
  ON CONFLICT(id) DO UPDATE SET status=excluded.status,voting_ends_at=excluded.voting_ends_at;
  INSERT INTO public.um_participants VALUES((m->>'id')::uuid,human,(m->>'hostId')::uuid,'human') ON CONFLICT DO NOTHING;
  IF m->>'opponent'<>'human' OR m->>'guestId' IS NOT NULL THEN
   INSERT INTO public.um_participants VALUES((m->>'id')::uuid,other,(m->>'guestId')::uuid,CASE WHEN m->>'opponent'='human' THEN 'human' WHEN m->>'opponent'='practice' THEN 'script' ELSE 'ai' END) ON CONFLICT DO NOTHING;
  END IF;
  FOR msg IN SELECT value FROM jsonb_array_elements(m->'messages') LOOP
   IF EXISTS(SELECT 1 FROM public.um_messages WHERE match_id=(m->>'id')::uuid AND id=msg->>'id' AND (seat<>msg->>'seat' OR body<>msg->>'text')) THEN RAISE EXCEPTION 'Immutable message'; END IF;
   INSERT INTO public.um_messages VALUES((m->>'id')::uuid,msg->>'id',msg->>'seat',msg->>'text',to_timestamp((msg->>'at')::double precision/1000)) ON CONFLICT DO NOTHING;
  END LOOP;
  correct:=0; incorrect:=0;
  right_choice:=CASE WHEN m->>'humanSeat' IS NOT NULL THEN human WHEN m->>'opponent'='human' THEN 'human' ELSE 'ai' END;
  FOR ballot IN SELECT * FROM jsonb_each_text(m->'votes') LOOP
   IF EXISTS(SELECT 1 FROM public.um_participants WHERE match_id=(m->>'id')::uuid AND user_id=ballot.key::uuid) THEN RAISE EXCEPTION 'Participant cannot vote'; END IF;
   IF (m->>'humanSeat' IS NOT NULL AND ballot.value NOT IN ('a','b')) OR (m->>'humanSeat' IS NULL AND ballot.value NOT IN ('human','ai')) THEN RAISE EXCEPTION 'Invalid ballot'; END IF;
   IF EXISTS(SELECT 1 FROM public.um_votes WHERE match_id=(m->>'id')::uuid AND user_id=ballot.key::uuid AND choice<>ballot.value) THEN RAISE EXCEPTION 'Immutable ballot'; END IF;
   INSERT INTO public.um_votes VALUES((m->>'id')::uuid,ballot.key::uuid,ballot.value) ON CONFLICT DO NOTHING;
   IF ballot.value=right_choice THEN correct:=correct+1; ELSE incorrect:=incorrect+1; END IF;
  END LOOP;
  IF m->>'status'='finished' THEN
   INSERT INTO public.um_match_results VALUES((m->>'id')::uuid,m->>'humanSeat',correct,incorrect,CASE WHEN correct+incorrect=0 THEN 'no-votes' WHEN correct=incorrect THEN 'draw' WHEN correct>incorrect THEN 'audience' ELSE 'contender' END) ON CONFLICT DO NOTHING;
  END IF;
 END LOOP;
 FOR q IN SELECT value FROM jsonb_array_elements(NEW.data->'inquiries') LOOP
  INSERT INTO public.um_enterprise_inquiries VALUES((q->>'id')::uuid,q->>'name',q->>'email',q->>'company',q->>'role',q->>'message',q->>'requirements',to_timestamp((q->>'at')::double precision/1000)) ON CONFLICT DO NOTHING;
 END LOOP;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.um_project_state() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER um_state_relational_projection AFTER INSERT OR UPDATE OF data ON public.um_app_state FOR EACH ROW EXECUTE FUNCTION public.um_project_state();
-- Backfill without changing original state or its revision. Transaction rolls back if any record fails validation.
UPDATE public.um_app_state SET data=data WHERE id=1;
COMMIT;
