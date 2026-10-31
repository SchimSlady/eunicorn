-- Deep-tech companies were being filed under "ai", which is wrong for quantum computers, chips,
-- robots, security software and drug developers. These values let us classify them properly.
alter type public.sector add value if not exists 'quantum';
alter type public.sector add value if not exists 'semiconductors';
alter type public.sector add value if not exists 'robotics';
alter type public.sector add value if not exists 'cybersecurity';
alter type public.sector add value if not exists 'biotech';
