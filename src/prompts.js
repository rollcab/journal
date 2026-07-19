const PROMPTS = [
    { id: 0, type: 'rating', question: 'How grateful are you feeling today?' },
    { id: 1, type: 'rating', question: 'Did you have a great day?' },
    { id: 2, type: 'rating', question: 'How energized do you feel right now?' },
    { id: 3, type: 'rating', question: 'How peaceful was your mind today?' },
    { id: 4, type: 'rating', question: 'How connected did you feel to others?' },
    { id: 5, type: 'rating', question: 'How proud are you of yourself today?' },
    { id: 6, type: 'rating', question: 'How well did you handle stress today?' },
    { id: 7, type: 'rating', question: 'How hopeful do you feel about tomorrow?' },
    { id: 8, type: 'rating', question: 'How satisfied are you with your productivity?' },
    { id: 9, type: 'rating', question: 'How much joy did you experience today?' },
    { id: 10, type: 'rating', question: 'How rested do you feel?' },
    { id: 11, type: 'rating', question: 'How confident did you feel today?' },
    { id: 12, type: 'rating', question: 'How balanced did your day feel?' },
    { id: 13, type: 'rating', question: 'How kind were you to yourself today?' },
    { id: 14, type: 'rating', question: 'How present were you in the moment?' },
    { id: 15, type: 'rating', question: 'How much did you laugh today?' },
    { id: 16, type: 'rating', question: 'How challenging was today overall?' },
    { id: 17, type: 'rating', question: 'How much did you learn today?' },
    { id: 18, type: 'rating', question: 'How creative did you feel?' },
    { id: 19, type: 'rating', question: 'How patient were you with yourself?' },
    { id: 20, type: 'rating', question: 'How much did you move your body today?' },
    { id: 21, type: 'rating', question: 'How nourished did your body feel?' },
    { id: 22, type: 'rating', question: 'How focused were you on what mattered?' },
    { id: 23, type: 'rating', question: 'How much anxiety did you carry today?' },
    { id: 24, type: 'rating', question: 'How supported did you feel?' },
    { id: 25, type: 'rating', question: 'How much wonder did you notice today?' },
    { id: 26, type: 'rating', question: 'How aligned did you feel with your values?' },
    { id: 27, type: 'rating', question: 'How much clutter was in your mind?' },
    { id: 28, type: 'rating', question: 'How brave were you today?' },
    { id: 29, type: 'rating', question: 'How much love did you give today?' },
    { id: 30, type: 'text', question: 'What is one thing that made you smile today?' },
    { id: 31, type: 'text', question: 'What challenged you the most today?' },
    { id: 32, type: 'text', question: 'What are you looking forward to?' },
    { id: 33, type: 'text', question: 'What would you tell your past self from this morning?' },
    { id: 34, type: 'text', question: 'What drained your energy today?' },
    { id: 35, type: 'text', question: 'What gave you energy today?' },
    { id: 36, type: 'text', question: 'What is weighing on your mind right now?' },
    { id: 37, type: 'text', question: 'What did you avoid today, and why?' },
    { id: 38, type: 'text', question: 'What small win are you celebrating?' },
    { id: 39, type: 'text', question: 'What surprised you today?' },
    { id: 40, type: 'text', question: 'What are you grateful for right now?' },
    { id: 41, type: 'text', question: 'What did you learn about yourself today?' },
    { id: 42, type: 'text', question: 'What conversation stuck with you?' },
    { id: 43, type: 'text', question: 'What would make tomorrow better?' },
    { id: 44, type: 'text', question: 'What are you overthinking about?' },
    { id: 45, type: 'text', question: 'What did you do well today?' },
    { id: 46, type: 'text', question: 'What do you wish you had done differently?' },
    { id: 47, type: 'text', question: 'What made you feel alive today?' },
    { id: 48, type: 'text', question: 'What habit are you building?' },
    { id: 49, type: 'text', question: 'What habit are you breaking?' },
    { id: 50, type: 'text', question: 'What is one kind thing someone did for you?' },
    { id: 51, type: 'text', question: 'What is one kind thing you did for someone?' },
    { id: 52, type: 'text', question: 'What fear showed up today?' },
    { id: 53, type: 'text', question: 'What courage did you show today?' },
    { id: 54, type: 'text', question: 'What are you curious about?' },
    { id: 55, type: 'text', question: 'What made you laugh out loud?' },
    { id: 56, type: 'text', question: 'What made you feel understood?' },
    { id: 57, type: 'text', question: 'What made you feel lonely?' },
    { id: 58, type: 'text', question: 'What are you holding onto that you could release?' },
    { id: 59, type: 'text', question: 'What boundary did you set or need to set?' },
    { id: 60, type: 'rating', question: 'How honest were you with yourself today?' },
    { id: 61, type: 'rating', question: 'How much screen time felt healthy today?' },
    { id: 62, type: 'rating', question: 'How well did you sleep last night?' },
    { id: 63, type: 'rating', question: 'How organized did your space feel?' },
    { id: 64, type: 'rating', question: 'How much did you enjoy your meals?' },
    { id: 65, type: 'rating', question: 'How much time did you spend outdoors?' },
    { id: 66, type: 'rating', question: 'How much did you procrastinate today?' },
    { id: 67, type: 'rating', question: 'How appreciated did you feel?' },
    { id: 68, type: 'rating', question: 'How much control did you feel over your day?' },
    { id: 69, type: 'rating', question: 'How much did you compare yourself to others?' },
    { id: 70, type: 'rating', question: 'How forgiving were you of mistakes today?' },
    { id: 71, type: 'rating', question: 'How much did you trust your instincts?' },
    { id: 72, type: 'rating', question: 'How much beauty did you notice today?' },
    { id: 73, type: 'rating', question: 'How much did you overcommit today?' },
    { id: 74, type: 'rating', question: 'How satisfied are you with your relationships?' },
    { id: 75, type: 'rating', question: 'How much did today feel meaningful?' },
    { id: 76, type: 'rating', question: 'How much did you listen vs. speak today?' },
    { id: 77, type: 'rating', question: 'How much did you enjoy being alone today?' },
    { id: 78, type: 'rating', question: 'How much did you enjoy being with others?' },
    { id: 79, type: 'rating', question: 'How much regret do you feel about today?' },
    { id: 80, type: 'text', question: 'Brain dump: what is on your mind with no filter?' },
    { id: 81, type: 'text', question: 'What emotion dominated your day?' },
    { id: 82, type: 'text', question: 'What would your ideal evening look like?' },
    { id: 83, type: 'text', question: 'What is one thing you want to remember about today?' },
    { id: 84, type: 'text', question: 'What question are you sitting with?' },
    { id: 85, type: 'text', question: 'What did you notice about your body today?' },
    { id: 86, type: 'text', question: 'What song, book, or show is on your mind?' },
    { id: 87, type: 'text', question: 'What are three words to describe today?' },
    { id: 88, type: 'text', question: 'What would you do if you had an extra hour?' },
    { id: 89, type: 'text', question: 'What advice would you give a friend in your situation?' },
    { id: 90, type: 'text', question: 'What are you proud of that nobody saw?' },
    { id: 91, type: 'text', question: 'What felt unfinished at the end of the day?' },
    { id: 92, type: 'text', question: 'What moment would you relive if you could?' },
    { id: 93, type: 'text', question: 'What moment would you skip if you could?' },
    { id: 94, type: 'text', question: 'What are you saying yes to lately?' },
    { id: 95, type: 'text', question: 'What are you saying no to lately?' },
    { id: 96, type: 'text', question: 'What dream or goal is calling to you?' },
    { id: 97, type: 'text', question: 'What old pattern showed up again?' },
    { id: 98, type: 'text', question: 'What new possibility opened up today?' },
    { id: 99, type: 'text', question: 'What do you need more of in your life?' },
    { id: 100, type: 'text', question: 'What do you need less of in your life?' },
    { id: 101, type: 'rating', question: 'How much did you honor your commitments today?' },
    { id: 102, type: 'rating', question: 'How much did you play or have fun today?' },
    { id: 103, type: 'rating', question: 'How much did you worry about the future?' },
    { id: 104, type: 'rating', question: 'How much did you dwell on the past?' },
    { id: 105, type: 'rating', question: 'How much did you feel seen today?' },
    { id: 106, type: 'rating', question: 'How much did you feel rushed today?' },
    { id: 107, type: 'rating', question: 'How much solitude did you get today?' },
    { id: 108, type: 'rating', question: 'How much did you express yourself authentically?' },
    { id: 109, type: 'rating', question: 'How much did you practice self-care?' },
    { id: 110, type: 'text', question: 'What is one thing you want to let go of before sleeping?' },
    { id: 111, type: 'text', question: 'What is one intention for tomorrow?' },
    { id: 112, type: 'text', question: 'Who made a difference in your day?' },
    { id: 113, type: 'text', question: 'What place or environment affected your mood?' },
    { id: 114, type: 'text', question: 'What decision are you wrestling with?' },
    { id: 115, type: 'text', question: 'What compliment would you give yourself today?' },
    { id: 116, type: 'text', question: 'What criticism are you giving yourself unfairly?' },
    { id: 117, type: 'text', question: 'What did today teach you about what you want?' },
    { id: 118, type: 'text', question: 'What did today teach you about what you do not want?' },
    { id: 119, type: 'text', question: 'If today were a chapter title, what would it be?' },
];

function hashString(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

function pickPromptIdsForDate(dateStr, count = CONFIG.PROMPTS_PER_DAY) {
    const poolSize = PROMPTS.length;
    const ids = [];
    let seed = hashString(dateStr);

    while (ids.length < count) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const id = seed % poolSize;
        if (!ids.includes(id)) ids.push(id);
    }

    return ids.sort((a, b) => a - b);
}

function getPromptById(id) {
    return PROMPTS.find(p => p.id === id) || null;
}

function getPromptsForDate(dateStr, storedIds = null) {
    const ids = storedIds && storedIds.length ? storedIds : pickPromptIdsForDate(dateStr);
    return ids.map(id => getPromptById(id)).filter(Boolean);
}

function ratingLabel(value) {
    const labels = ['Very bad', 'Bad', 'Okay', 'Good', 'Great'];
    const index = Math.min(labels.length - 1, Math.max(0, Math.round((value - 1) / 2)));
    return labels[index];
}
