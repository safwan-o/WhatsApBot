const modulePromise = require('./exporter');

(async () => {
    const { client, db, getCodeforcesContests, secondsToHMS, qrcode, schedule } = await modulePromise;

    db.read().then(() => db.write()).catch(err => console.error('Error reading database:', err));

    client.on('qr', (qr) => qrcode.generate(qr, { small: true }));

    client.on('ready', async () => {
        console.log('Bot is ready!');
        var timeout = 10000; // 10 seconds

        const checkContests = async () => {
            try {
                // Fetch group chat
                const chats = await client.getChats();
                const group = chats.find(chat => chat.name === "Java_to_python");

                if (!group) {
                    console.error("❌ Group not found! Check the group name.");
                    return;
                }

                const groupId = group.id._serialized;
                console.log("✅ Found Group:", groupId);

                // Start scheduling messages after group is found
                schedule.scheduleJob('* * * * *', async () => {
                    console.log("🔍 Checking for new contests...");
                    const contests = await getCodeforcesContests();
                    const WeekinSeconds = 604800;
                    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
                    var timeLeft = Infinity;

                    if (contests.length > 0) {
                        contests.sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);
                        for (const contest of contests) {
                            if (contest.startTimeSeconds > currentTimeInSeconds + WeekinSeconds && !contest.name.includes("ICPC")) {
                                continue;
                            }
                            timeLeft = contest.startTimeSeconds - currentTimeInSeconds;

                            const message = `⏰ *Contest Alert*: ${contest.name} starts at ${new Date(contest.startTimeSeconds * 1000).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: '2-digit',
                                year: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: true
                            })}`;
                            const priorityMessage = `🚨 *Contest Alert*: ${contest.name} starts in *${secondsToHMS(timeLeft)}*`;
                            const priorityTime = 3600 * 24 * 4; // 1 day
                            if (!timeLeft < priorityTime) {
                                contests.sort((a, b) => b.startTimeSeconds - a.startTimeSeconds);
                            }

                            try {
                                if (timeLeft < priorityTime && timeLeft > 0) {
                                    await client.sendMessage(groupId, priorityMessage);
                                    console.log(`✅ Sent Priority contest alert: ${contest.name}`);
                                    if (timeLeft < 10 * 60 * 1000) { // 10 minutes
                                        timeout = 3 * 60 * 1000; // 3 minutes
                                        break;
                                    } else if (timeLeft < 60 * 60 * 1000) { // 1 hour
                                        timeout = 20 * 60 * 1000; // 20 minutes
                                        break;
                                    } else if (timeLeft < 6 * 60 * 60 * 1000) { // 6 hours
                                        timeout = 2 * 60 * 60 * 1000; // 2 hours
                                        break;
                                    } else {
                                        timeout = 6 * 60 * 60 * 1000; // 6 hours
                                        break;
                                    }
                                } else {
                                    await client.sendMessage(groupId, message);
                                    console.log(`✅ Sent contest alert: ${contest.name}`);
                                    timeout = 24 * 60 * 60 * 1000; // 24 hours
                                    console.log(`Next message in: ${timeout / 1000 / 60} minutes`);
                                }
                            } catch (err) {
                                console.error('❌ Error sending message:', err);
                            }
                        }
                    } else {
                        console.log('⏳ No upcoming contests found.');
                    }
                    console.log(`Next message in: ${timeout / 1000 / 60} minutes`);
                    setTimeout(checkContests, timeout); // Reschedule the check with the updated timeout
                });

            } catch (error) {
                console.error('❌ Error fetching chats:', error);
            }
        };

        setTimeout(checkContests, timeout); // Initial scheduling
    });

    client.initialize();
})();