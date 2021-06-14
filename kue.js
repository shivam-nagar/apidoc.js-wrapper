var kue = require("kue");
var Queue = kue.createQueue();

Queue.watchStuckJobs();

let getKueApp = () => {
    return kue.app;
}

let getKueQueue = () => {
    return Queue;
}

let scheduleJob = (data, callback) => {
    console.log("Scheduling Job")
    console.log(data.jobName, data.params)
    try {
        let job = Queue.createJob(data.jobName, {
                title: "Building repo: " + data.params.repo,
                data: data.params
            })
            .attempts(1)
            .ttl( 5 * 60 * 1000)    // 15 min
            .delay(5000)
            .save((e) => {
                if (!e) console.log(job.id);
                callback(job.id);
            });
        console.log("Job Scheduled");
    } catch (e) {
        console.error(e);
        callback();
    }
};

module.exports = {
    scheduleJob,
    getKueApp,
    getKueQueue
};