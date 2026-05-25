alter table matches
  add column if not exists player_a_ai_strategy text,
  add column if not exists player_b_ai_strategy text;

notify pgrst, 'reload schema';
