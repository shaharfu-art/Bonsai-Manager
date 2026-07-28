/**
 * User Level / Rank system
 * Calculated in real-time based on activity metrics
 */

export interface LevelInfo {
  level: number
  name: string
  nameEn: string
  icon: string
  nextLevel: LevelRequirements | null
  progress: number // 0-1, progress to next level
}

export interface LevelRequirements {
  trees: number
  treatments: number
  friends: number
  posts: number
}

const LEVELS: Array<{ name: string; nameEn: string; icon: string; requirements: LevelRequirements }> = [
  { name: 'נבט', nameEn: 'Seedling', icon: '🌱', requirements: { trees: 1, treatments: 0, friends: 0, posts: 0 } },
  { name: 'שתיל', nameEn: 'Sprout', icon: '🌿', requirements: { trees: 3, treatments: 10, friends: 0, posts: 0 } },
  { name: 'מגדל', nameEn: 'Grower', icon: '🌳', requirements: { trees: 7, treatments: 30, friends: 3, posts: 1 } },
  { name: 'אמן', nameEn: 'Artist', icon: '🎋', requirements: { trees: 15, treatments: 60, friends: 5, posts: 5 } },
  { name: 'מאסטר', nameEn: 'Master', icon: '👑', requirements: { trees: 25, treatments: 100, friends: 10, posts: 10 } },
]

export interface UserStats {
  trees: number
  treatments: number
  friends: number
  posts: number
}

export function calculateLevel(stats: UserStats): LevelInfo {
  let currentLevel = 0

  for (let i = LEVELS.length - 1; i >= 0; i--) {
    const req = LEVELS[i].requirements
    if (
      stats.trees >= req.trees &&
      stats.treatments >= req.treatments &&
      stats.friends >= req.friends &&
      stats.posts >= req.posts
    ) {
      currentLevel = i
      break
    }
  }

  const current = LEVELS[currentLevel]
  const next = currentLevel < LEVELS.length - 1 ? LEVELS[currentLevel + 1] : null

  // Calculate progress to next level
  let progress = 1 // max level
  if (next) {
    const req = next.requirements
    const factors = [
      req.trees > 0 ? Math.min(1, stats.trees / req.trees) : 1,
      req.treatments > 0 ? Math.min(1, stats.treatments / req.treatments) : 1,
      req.friends > 0 ? Math.min(1, stats.friends / req.friends) : 1,
      req.posts > 0 ? Math.min(1, stats.posts / req.posts) : 1,
    ]
    progress = factors.reduce((sum, f) => sum + f, 0) / factors.length
  }

  return {
    level: currentLevel + 1,
    name: current.name,
    nameEn: current.nameEn,
    icon: current.icon,
    nextLevel: next?.requirements ?? null,
    progress,
  }
}

export function getLevelIcon(stats: UserStats): string {
  return calculateLevel(stats).icon
}
