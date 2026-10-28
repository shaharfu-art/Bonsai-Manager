-- =============================================================
-- UNLOCK FREE TIER — run in Supabase SQL Editor
-- Makes all users (free plan) have unlimited trees
-- Safe to run: only affects users with plan = 'free'
-- Paid users (premium/pro) are not touched.
-- =============================================================

-- Bump max_trees to 9999 for all free-tier users
UPDATE user_profiles
SET max_trees = 9999
WHERE plan = 'free' OR plan IS NULL;

-- Verify
SELECT plan, count(*), min(max_trees), max(max_trees)
FROM user_profiles
GROUP BY plan;


-- =============================================================
-- TO RESTORE (when you want to re-enable payments):
-- 1. Revert PLAN_LIMITS in src/hooks/usePlan.ts:
--      free: { maxTrees: 3, aiDailyLimit: 2 }
--    and restore the setMaxTrees line to: data.max_trees || PLAN_LIMITS[userPlan].maxTrees
-- 2. Run this SQL to reset free users back to 3 trees:
--
-- UPDATE user_profiles
-- SET max_trees = 3
-- WHERE plan = 'free' OR plan IS NULL;
-- =============================================================
