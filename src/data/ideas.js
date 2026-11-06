/*
 * Easy-win ideas behind the 💡 button. Nothing is ever added unless the family taps it.
 * freq: 'daily' | 'w1'..'w6' | 'once'
 */
export const IDEAS = {
  todo: {
    tasks: [['Do the dishes', 'daily'], ['Make the bed', 'daily'], ['10-minute tidy', 'daily'], ['Laundry', 'w2'], ['Take out the trash', 'w1'], ['Wipe the kitchen counters', 'daily'], ['Plan tomorrow tonight', 'daily']],
    goals: [['Clean out the garage', [['Clear one shelf', 'w3'], ['Donate run', 'once']]], ['Organize the pantry', [['Toss expired food', 'once'], ['Group like items', 'once']]], ['Get the car serviced', [['Book the appointment', 'once']]]],
    plans: [{ title: '7-Day Declutter', desc: 'Fill one bag a day for a week.', tasks: [['Fill one bag to donate or toss', 'daily']] }, { title: 'Reset Sunday', desc: 'A calm start to every week.', tasks: [['Laundry done', 'w1'], ['Meal plan the week', 'w1'], ['10-minute tidy', 'daily']] }]
  },
  financial: {
    tasks: [['Log today’s purchases', 'daily'], ['Check the bank balance', 'w2'], ['Pack lunch instead of buying', 'w3'], ['No-spend day', 'w2'], ['Review subscriptions', 'once']],
    goals: [['Save the $1,000 starter emergency fund', [['Move $25 to savings', 'w1'], ['Sell one thing we don’t use', 'once']]], ['Pay off the smallest debt', [['Pay extra on it', 'w1']]], ['Cancel one subscription', [['List every subscription', 'once'], ['Cancel the one we use least', 'once']]]],
    plans: [{ title: '7-Day Money Reset', desc: 'One small money step a day.', tasks: [['Log every purchase today', 'daily'], ['Find one thing to cut', 'once'], ['Talk money with your spouse', 'once']] }, { title: 'No-Spend Weekend', desc: 'A free, fun weekend at home.', tasks: [['Plan a free activity', 'once'], ['Cook every meal at home', 'w2']] }]
  },
  relational: {
    tasks: [['Family dinner at the table', 'w3'], ['Date night', 'w1'], ['Text a friend', 'w2'], ['Call a parent or grandparent', 'w1'], ['10 minutes of 1-on-1 time with a kid', 'daily'], ['Say three things you appreciate', 'daily']],
    goals: [['Host friends for dinner', [['Pick a date', 'once'], ['Invite them', 'once'], ['Plan the menu', 'once']]], ['Plan a family day trip', [['Choose where', 'once'], ['Put it on the calendar', 'once']]], ['Write a letter to someone who matters', [['Write it', 'once'], ['Mail it', 'once']]]],
    plans: [{ title: 'Date Night Month', desc: 'One simple date every week this month.', tasks: [['Date night', 'w1'], ['Phones away at dinner', 'w3']] }, { title: '7 Days of Encouragement', desc: 'Lift someone up every day.', tasks: [['Send one encouraging message', 'daily']] }]
  },
  physical: {
    tasks: [['Walk 10 minutes', 'daily'], ['Drink 8 glasses of water', 'daily'], ['In bed by 10:30', 'daily'], ['Stretch 5 minutes', 'daily'], ['Workout', 'w3'], ['Veggies at dinner', 'daily']],
    goals: [['Run a 5K', [['Run 20 minutes', 'w3'], ['Sign up for a race', 'once']]], ['Get a check-up', [['Book the appointment', 'once']]], ['Walk 100 miles this year', [['Walk 2 miles', 'w3']]]],
    plans: [{ title: '30-Day Walk', desc: 'Ten minutes outside, every day.', tasks: [['Walk 10 minutes', 'daily']] }, { title: 'Sleep Reset Week', desc: 'Better sleep in seven nights.', tasks: [['Screens off 30 minutes before bed', 'daily'], ['In bed by 10:30', 'daily']] }]
  },
  spiritual: {
    tasks: [['Time with God', 'daily'], ['Read one chapter', 'w5'], ['Pray together as a family', 'w3'], ['Write 3 things I’m thankful for', 'daily'], ['Quiet 10 minutes, no phone', 'daily'], ['Go to church', 'w1']],
    goals: [['Read through the Gospels', [['Read one chapter', 'w5']]], ['Memorize a verse', [['Practice it', 'daily']]], ['Serve somewhere this month', [['Find a place to serve', 'once'], ['Sign up', 'once']]]],
    plans: [{ title: '7-Day Gratitude', desc: 'Three good things every day.', tasks: [['Write 3 things I’m thankful for', 'daily']] }, { title: 'Psalms in 30 Days', desc: 'Five psalms a day, one month.', tasks: [['Read today’s psalms', 'daily']] }]
  }
};
