-- Users with push (after email campaign)
SELECT count(DISTINCT user_id) as users_with_push FROM push_subscriptions;

-- Users with location set
SELECT count(*) as users_with_location FROM user_profiles WHERE trees_lat IS NOT NULL;

-- Detail: who has push now
SELECT up.display_name, up.username, up.email,
  CASE WHEN ps.user_id IS NOT NULL THEN 'YES' ELSE 'NO' END as has_push,
  CASE WHEN up.trees_lat IS NOT NULL THEN 'YES' ELSE 'NO' END as has_location
FROM user_profiles up
LEFT JOIN (SELECT DISTINCT user_id FROM push_subscriptions) ps ON ps.user_id = up.id
ORDER BY has_push DESC, has_location DESC;
