interface ZyroResponse {
  text: string;
}

const TOPICS = {
  health: ['water', 'nutrition', 'fruit', 'vegetable', 'eat', 'food', 'diet', 'sleep', 'rest', 'energy', 'vitamin', 'breakfast', 'lunch', 'dinner'],
  exercise: ['exercise', 'workout', 'run', 'walk', 'stretch', 'gym', 'muscle', 'cardio', 'steps', 'movement', 'fitness', 'sport', 'yoga', 'jump'],
  stress: ['stress', 'anxious', 'anxiety', 'worry', 'calm', 'relax', 'breathing', 'meditate', 'overwhelm', 'pressure', 'mental', 'mood', 'sad', 'happy', 'focus'],
  environment: ['environment', 'eco', 'recycle', 'plastic', 'climate', 'planet', 'earth', 'tree', 'plant', 'carbon', 'green', 'sustain', 'pollution', 'waste', 'nature'],
};

const RESPONSES: Record<string, string[]> = {
  health: [
    "Great question about health! Here's a tip: aim for a balanced plate with half fruits and veggies, a quarter protein, and a quarter whole grains. This gives you steady energy for studying and playing.\n\nTry to eat a rainbow of colors each day — different colored foods have different vitamins that help your body grow strong!",
    "Staying healthy is all about small daily habits. Drink water before you feel thirsty, eat meals at regular times, and try to get 8 hours of sleep. Your brain works better when your body is well cared for.\n\nDid you know? Skipping breakfast can make it harder to concentrate in class. Even a banana and some nuts can help!",
    "Your body is like a machine that needs the right fuel. Whole foods like fruits, vegetables, nuts, and grains give you long-lasting energy. Processed snacks with lots of sugar give a quick boost but then a crash.\n\nA good rule: if it grew in the ground or on a tree, it's probably a great choice!",
  ],
  exercise: [
    "Exercise is fantastic for both body and mind! Aim for at least 30 minutes of movement each day. This could be walking, dancing, playing sports, or even helping with chores.\n\nFun fact: Exercise releases endorphins — your brain's natural 'feel-good' chemicals. That's why you feel happier after playing outside!\n\nTry this: Do 10 jumping jacks, 10 squats, and a 30-second plank. Repeat 3 times. That's a quick full-body workout!",
    "Movement doesn't have to be boring! You can dance to your favorite song, play tag with friends, or walk while listening to music. The best exercise is the one you enjoy doing.\n\nRemember to warm up before exercising and stretch afterward to prevent injuries. Your muscles will thank you!",
    "Want to build strength? Start simple: push-ups (even on your knees), squats, and lunges use your own body weight. Do 3 sets of 10 and rest 30 seconds between sets.\n\nConsistency beats intensity. Doing a little bit every day is better than one big workout once a week!",
  ],
  stress: [
    "Feeling stressed is completely normal — everyone does sometimes! Here are some quick ways to feel calmer:\n\n1. Take 5 slow, deep breaths (in through your nose, out through your mouth)\n2. Write down what's worrying you — seeing it on paper can make it feel smaller\n3. Talk to someone you trust — a friend, teacher, or family member\n4. Take a short walk outside — fresh air really does help\n\nYou've got this!",
    "When stress builds up, try the 4-7-8 breathing technique: breathe in for 4 seconds, hold for 7, and exhale slowly for 8. Do this 4 times. It tells your nervous system to calm down.\n\nAlso, remember: it's okay to take breaks. Studying for hours without rest actually makes you learn LESS. Try 25 minutes of focus, then a 5-minute break.\n\nIf stress feels too big to handle alone, talking to a school counselor is a brave and smart choice.",
    "Your mind needs care just like your body. Here are daily habits that boost mental wellbeing:\n\n- Gratitude: Write 3 good things that happened today\n- Movement: Even a short walk lifts your mood\n- Connection: Chat with a friend or family member\n- Sleep: Aim for 8-9 hours — your brain processes emotions while you sleep\n- Less screen time before bed: The blue light can keep you awake\n\nSmall steps add up to big changes!",
  ],
  environment: [
    "Caring for the planet is easier than you think! Here are simple things you can do every day:\n\n- Use a reusable water bottle instead of single-use plastic\n- Turn off lights and devices when you leave a room\n- Walk, bike, or take the bus instead of asking for a car ride\n- Recycle paper, plastic, and cans at school\n- Eat less meat — even one meatless meal a week helps!\n\nSmall actions from many people create huge change. You're already making a difference by caring!",
    "Did you know that producing 1 plastic bottle uses about 1.4 liters of water and creates carbon emissions? By using a reusable bottle, you save hundreds of plastic bottles a year!\n\nTrees are amazing — they absorb CO2, provide oxygen, cool cities, and give homes to animals. Planting or caring for even one tree makes a real difference.\n\nChallenge idea: Try a 'zero waste lunch' day — pack food in reusable containers with no throwaway packaging!",
    "Climate change can feel scary, but your generation has the power to make a huge difference! Here's what matters most:\n\n- Reduce: Buy only what you need\n- Reuse: Find new life for old items\n- Recycle: Sort your waste properly\n- Refuse: Say no to single-use plastics\n- Rot: Compost food scraps if you can\n\nEvery eco challenge you complete on GREENFIT is a real step toward a healthier planet!",
  ],
  general: [
    "Hi! I'm ZYRO, your health and eco assistant. I can help with questions about health, exercise, stress, wellbeing, and the environment.\n\nTry asking me things like:\n- 'How much water should I drink?'\n- 'What exercises can I do at home?'\n- 'I feel stressed about exams, what can I do?'\n- 'How can I be more eco-friendly at school?'\n\nI'm here to help you live healthier and greener!",
    "I'm ZYRO, and I'm here to support your health and eco journey! Whether it's about nutrition, exercise, managing stress, or helping the planet, I've got tips for you.\n\nWhat would you like to know about today?",
    "Great question! I can help with health tips, exercise ideas, stress management, and environmental advice. Could you tell me a bit more about what you're looking for?\n\nFor example, are you wondering about food, workouts, feeling calm, or being eco-friendly? I'll give you the best tips I can!",
  ],
};

function matchTopic(question: string): keyof typeof TOPICS | 'general' {
  const q = question.toLowerCase();
  for (const [topic, keywords] of Object.entries(TOPICS)) {
    if (keywords.some((kw) => q.includes(kw))) {
      return topic as keyof typeof TOPICS;
    }
  }
  return 'general';
}

export function getZyroResponse(question: string): ZyroResponse {
  const topic = matchTopic(question);
  const responses = RESPONSES[topic];
  const text = responses[Math.floor(Math.random() * responses.length)];
  return { text };
}
