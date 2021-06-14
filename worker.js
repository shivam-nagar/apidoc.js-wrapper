const kue = require('./kue')
var tmp = require('tmp');
const jsonfile = require('jsonfile')
const simpleGit = require('simple-git')
const fs = require("fs"); // Or `import fs from "fs";` with ESM
const apidoc = require('apidoc')

const apiDocsMasterJson = require('./apidocs.json');

var Queue = kue.getKueQueue();
const destDir = __dirname + '/apidocs';

let init = () => {
    Queue.process("buildRepoDocs", 1, (job, done) => {
        jobData = job.data.data;

        var tmpSrcDir = tmp.dirSync();
        var tmpSrcDirName = tmpSrcDir.name;
        var repoObj = getRepoObj(jobData.repo);
        
        try {
            updateProgress(0, job);
            job.log("buildRepoDocs called with data %s", JSON.stringify(job.data.data));
            job.log("User: %s",require("os").userInfo().username);
            job.log("Operating in temp directory : ", tmpSrcDirName + '/' + repoObj['repository_name']);

            repoObj['branch'] = jobData.checkoutEntity || 'master';
            checkoutRepo(tmpSrcDirName, repoObj, () => {
                updateProgress(1, job);
                createAPIDocsJson(tmpSrcDirName, repoObj, () => {
                    updateProgress(2, job);
                    buildAPIDocs(tmpSrcDirName, repoObj, (x) => {
                        updateProgress(3, job);
                        tmpSrcDir.removeCallback();
                        if(!x) {
                            done("nothing to do");
                            return;
                        }
                        updateJobStatus(job, repoObj, () => {
                            updateProgress(4, job);
                            done();
                        });
                    });
                })
            })
        } catch(e) {
            done(e)
        }

        return "success";
    });
}

let getRepoObj = (key) => {
    var docs = apiDocsMasterJson.filter((x) => {
        return x.repository_name == key
    });
    return docs[0];
}

let updateJobStatus = (job, repoObj, callback) => {
    const logFilePath = destDir + '/status.json';
    var logFile = [];
    job.log("reading file "+ logFilePath);
    jsonfile.readFile(logFilePath, (err, obj) => {
        if (err) {
            job.error(err);
            console.error(err)
        }
        logFile = obj;
        logFileData = logFile.filter((x) => {
            return x.repository_name != repoObj.repository_name
        });
    
        repoObj.has_doc = true;
        repoObj.last_updated = Date.now();
    
        job.log("updating : " + repoObj);

        logFileData.push(repoObj)
        jsonfile.writeFile(logFilePath, logFileData, function (err) {
            if (err) {
                job.error(err);
                console.error(err)
            } else {
                callback();
            }
        });
    });
}

let updateProgress = (step, job) => {
    var log = "";
    switch (step) {
        case 0:
            log = "Job Queued";
            break;
        case 1:
            log = "Repo cloned and checkout done";
            break;
        case 2:
            log = "apidocs.json created";
            break;
        case 3:
            log = "APIdoc build complete";
            break;
        case 4:
            log = "Job complete";
            break;
    }
    job.progress(step, 4);
    job.log(log);
}

let checkoutRepo = (srcDir, repoObj, checkoutSuccessCb) => {
    git = simpleGit(srcDir);
    git.clone(repoObj['repository_path'])
    git.cwd(srcDir + '/' + repoObj['repository_name'])
    git.checkout(repoObj['branch'], checkoutSuccessCb);
}

let createAPIDocsJson = (srcDir, repoObj, callback) => {
    const file = srcDir + '/' + repoObj['repository_name'] + '/apidoc.json';
    jsonfile.writeFile(file, repoObj, function (err) {
        if (err) {
            console.error(err)
        } else {
            callback();
        }
    });
}

let buildAPIDocs = (srcDir, repoObj, callback) => {
    var docResult = apidoc.createDoc({
        src: srcDir + '/' + repoObj['repository_name'],
        dest: destDir + '/' + repoObj['repository_name']
    });
    if (fs.existsSync(destDir + '/' + repoObj['repository_name'])) {
        callback(true)
        return;
    }
    callback(false);
}

module.exports = {
    init
};