import type { Challenge } from './types';

export const CHALLENGES: Challenge[] = [
  { id: 'drink-water', title: 'Drink 8 Glasses of Water', description: 'Stay hydrated throughout the day to keep your body and mind sharp.', category: 'health', points: 10, icon: 'Droplet' },
  { id: 'walk-5000', title: 'Walk 5,000 Steps', description: 'Get moving and reach 5,000 steps today.', category: 'health', points: 15, icon: 'Footprints' },
  { id: 'eat-fruit', title: 'Eat 3 Fruits or Veggies', description: 'Fuel your body with colorful fruits and vegetables.', category: 'health', points: 10, icon: 'Apple' },
  { id: 'stretch', title: 'Stretch for 5 Minutes', description: 'Loosen up your muscles and improve your posture.', category: 'health', points: 8, icon: 'Activity' },
  { id: 'sleep-8h', title: 'Sleep 8 Hours', description: 'Give your brain the rest it needs to learn and grow.', category: 'health', points: 12, icon: 'Moon' },
  { id: 'deep-breath', title: 'Practice Deep Breathing', description: 'Take 5 minutes to breathe slowly and calm your mind.', category: 'health', points: 8, icon: 'Wind' },
  { id: 'no-plastic', title: 'Go Plastic-Free Today', description: 'Avoid single-use plastics. Bring a reusable bottle and bag.', category: 'eco', points: 15, icon: 'Recycle' },
  { id: 'plant-tree', title: 'Plant or Water a Plant', description: 'Care for a plant or tree in your home or school garden.', category: 'eco', points: 20, icon: 'TreeDeciduous' },
  { id: 'turn-off-lights', title: 'Turn Off Unused Lights', description: 'Save energy by switching off lights and devices you are not using.', category: 'eco', points: 10, icon: 'Lightbulb' },
  { id: 'use-stairs', title: 'Take the Stairs', description: 'Skip the elevator and use the stairs for a mini workout.', category: 'health', points: 8, icon: 'TrendingUp' },
  { id: 'recycle-paper', title: 'Recycle Paper Waste', description: 'Collect and recycle used paper instead of throwing it away.', category: 'eco', points: 12, icon: 'FileText' },
  { id: 'outdoor-time', title: 'Spend 20 Minutes Outside', description: 'Get fresh air and connect with nature.', category: 'health', points: 10, icon: 'Sun' },
  { id: 'meatless-meal', title: 'Eat One Meatless Meal', description: 'Reduce your carbon footprint with a plant-based meal.', category: 'eco', points: 12, icon: 'Salad' },
  { id: 'pick-litter', title: 'Pick Up 5 Pieces of Litter', description: 'Help keep your school and neighborhood clean.', category: 'eco', points: 15, icon: 'Trash2' },
  { id: 'mindful-study', title: 'Study Without Distractions', description: 'Put away your phone and focus fully for 30 minutes.', category: 'health', points: 10, icon: 'Brain' },
  { id: 'cold-shower', title: 'Take a Short Shower', description: 'Save water by keeping your shower under 5 minutes.', category: 'eco', points: 8, icon: 'ShowerHead' },
];

export const TROPHY_DEFS: { id: string; name: string; description: string; icon: string }[] = [
  { id: 'first-challenge', name: 'First Steps', description: 'Complete your first challenge', icon: 'Award' },
  { id: 'streak-3', name: 'On Fire', description: 'Reach a 3-day streak', icon: 'Flame' },
  { id: 'streak-7', name: 'Week Warrior', description: 'Reach a 7-day streak', icon: 'Trophy' },
  { id: 'streak-30', name: 'Unstoppable', description: 'Reach a 30-day streak', icon: 'Medal' },
  { id: 'points-100', name: 'Century Club', description: 'Earn 100 total points', icon: 'Star' },
  { id: 'points-500', name: 'Eco Champion', description: 'Earn 500 total points', icon: 'Crown' },
  { id: 'points-1000', name: 'GreenFit Legend', description: 'Earn 1,000 total points', icon: 'Gem' },
  { id: 'double-impact-5', name: 'Double Trouble', description: 'Use Double Impact 5 times', icon: 'Zap' },
  { id: 'water-master', name: 'Hydration Hero', description: 'Drink 8 glasses of water for 7 days', icon: 'Droplets' },
  { id: 'eco-warrior', name: 'Eco Warrior', description: 'Complete 10 eco challenges', icon: 'Leaf' },
  { id: 'health-hero', name: 'Health Hero', description: 'Complete 10 health challenges', icon: 'Heart' },
  { id: 'routine-complete', name: 'Routine Master', description: 'Complete all routine items in one day', icon: 'CheckCircle' },
];
