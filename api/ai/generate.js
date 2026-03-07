const authMiddleware = require('../../_lib/auth');
const setCors = require('../../_lib/cors');

function generateSchedule(data) {
    const { role, chronotype, studyHours, exercise, goal, suggestions } = data;

    const isStudent = role === 'student';
    const isMorning = chronotype === 'morning';
    const study = parseInt(studyHours) || 4;
    const doesExercise = exercise === 'yes';

    const timeSlots = [
        '5:00-6:00', '6:00-7:00', '7:00-8:00', '8:00-9:00', '9:00-10:00',
        '10:00-11:00', '11:00-12:00', '12:00-13:00', '13:00-14:00', '14:00-15:00',
        '15:00-16:00', '16:00-17:00', '17:00-18:00', '18:00-19:00', '19:00-20:00'
    ];

    let schedule = timeSlots.map(time => ({ time, task: '' }));

    if (isMorning) {
        schedule[0].task = 'Wake up & morning routine';
        schedule[1].task = doesExercise ? 'Exercise / Workout' : 'Meditation & stretching';
        schedule[2].task = 'Healthy breakfast & planning';
        schedule[3].task = isStudent ? 'Study Block 1 – Hard subjects' : 'Deep work – Priority tasks';
        schedule[4].task = isStudent ? 'Study Block 2 – Review notes' : 'Meetings / Emails';
        schedule[5].task = 'Short break & hydration';
        schedule[6].task = isStudent ? 'Study Block 3 – Practice problems' : 'Project work';
        schedule[7].task = 'Lunch break';
        schedule[8].task = 'Rest / Light reading';
        schedule[9].task = isStudent ? 'Study Block 4 – Light revision' : 'Administrative tasks';
        schedule[10].task = isStudent ? 'Group study / Discussion' : 'Creative/strategic work';
        schedule[11].task = 'Break & snack';
        schedule[12].task = 'Personal project / Skill building';
        schedule[13].task = 'Dinner & family time';
        schedule[14].task = 'Plan for tomorrow & wind down';
    } else {
        schedule[0].task = 'Wake up slowly';
        schedule[1].task = 'Morning hygiene & breakfast';
        schedule[2].task = doesExercise ? 'Exercise / Yoga' : 'Light walk';
        schedule[3].task = 'Light tasks / Emails';
        schedule[4].task = isStudent ? 'Study Block 1 – Easy review' : 'Planning & light work';
        schedule[5].task = 'Lunch break';
        schedule[6].task = isStudent ? 'Study Block 2 – Core subjects' : 'Deep work begins';
        schedule[7].task = isStudent ? 'Study Block 3 – Problem solving' : 'Client work / Projects';
        schedule[8].task = 'Short break';
        schedule[9].task = isStudent ? 'Study Block 4 – Revision' : 'Focus sprint';
        schedule[10].task = 'Tea/coffee break';
        schedule[11].task = 'Personal project / Reading';
        schedule[12].task = 'Dinner';
        schedule[13].task = isStudent ? 'Study Block 5 – Night revision' : 'Strategy & planning';
        schedule[14].task = 'Relax & wind down';
    }

    const goalPriorities = {
        focus: ['Complete most important task first', 'No distractions during deep work', 'Review progress at end of day'],
        balance: ['Work-life balance – stick to schedule', 'Take all planned breaks', 'Connect with someone today'],
        health: ['Exercise completed', 'Healthy meals & hydration', 'Adequate sleep tonight'],
        productivity: ['Finish top 3 tasks', 'Minimize context switching', 'Track time spent on each task'],
        learning: ["Cover today's study plan", 'Practice active recall', 'Review what you learned tonight']
    };
    const priorities = goalPriorities[goal] || goalPriorities['productivity'];

    const todos = [
        { text: isStudent ? 'Complete assignments due today' : 'Clear inbox to zero', done: false },
        { text: doesExercise ? 'Log workout session' : 'Take a 20-min walk', done: false },
        { text: 'Drink 8 glasses of water', done: false },
        { text: isStudent ? 'Prepare notes for tomorrow' : 'Update project status', done: false },
        { text: 'Spend 30 minutes reading', done: false }
    ];

    const note = `AI Generated Plan – ${new Date().toLocaleDateString()}\n\nProfile: ${isStudent ? 'Student' : 'Working Professional'} | ${isMorning ? 'Morning' : 'Night'} Person | Study/Work: ${study}h/day${doesExercise ? ' | Active lifestyle' : ''}\n\nGoal: ${goal || 'Productivity'}\n${suggestions ? '\nYour suggestions have been incorporated into this plan.' : ''}`;

    const tomorrow = `Review today's completed tasks.\n${isStudent ? 'Prepare materials for upcoming lessons.' : 'Plan the next sprint/milestone.'}\nSleep by 10:30 PM for optimal performance.`;

    if (suggestions && suggestions.trim()) {
        schedule[3].task = suggestions.trim().split('\n')[0] || schedule[3].task;
    }

    return { schedule, priorities, todos, note, tomorrow };
}

// POST /api/ai/generate
module.exports = async function handler(req, res) {
    if (setCors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed.' });
    const user = authMiddleware(req, res);
    if (!user) return;
    try {
        const { role, chronotype, studyHours, exercise, goal, suggestions, hasSuggestions } = req.body;
        if (!role || !chronotype) {
            return res.status(400).json({ message: 'role and chronotype are required.' });
        }
        const result = generateSchedule({
            role, chronotype, studyHours, exercise, goal,
            suggestions: hasSuggestions ? suggestions : ''
        });
        res.json({ message: 'Schedule generated.', ...result });
    } catch (err) {
        console.error('[/api/ai/generate]', err);
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};
