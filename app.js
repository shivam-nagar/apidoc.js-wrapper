const express = require("express")
const bodyParser = require("body-parser");

const kue = require('./kue')
const worker = require('./worker')

const apiDocs = require('./apidocs.json');
const fs = require("fs");

const destDir = __dirname + '/apidocs';

let bootstrap = () => {
    console.log("Bootstrapping...")
    const app = express()
    // support parsing of application/json type post data  
    app.use(bodyParser.json());
    app.use("/api/kue-api/", kue.getKueApp());

    app.get("/api/api-docs", (req, res) => {
        return res.json(apiDocs);
    });

    app.get("/api/api-docs-status", (req, res) => {
        if(fs.existsSync(destDir)) {
            statusFilePath = destDir + '/status.json';
            const status = JSON.parse(fs.readFileSync(statusFilePath, 'utf-8'));
            return res.json(status);
        }
        return res.json({});
    });

    // body: 
    // {
    //     repo: 'pebbletrace',
    //     tag: '1.1.1',
    //     branch: 'master'
    // }
    app.post("/api/build-repo-docs", async (req, res) => {
        console.log("build-repo-docs called, Repo: " + req.body.repo)
        let args = {
            jobName: "buildRepoDocs",
            params: req.body
        };
        kue.scheduleJob(args, (jobId) => {
            if (!jobId) {
                return res.status(500);
            }
            return res.status(200).json({
                success: true,
                job_id: jobId
            });
        });
    });

    app.post("/api/build-repo-docs/status", async (req, res) => {
        console.log("build-repo-docs status called for JobID - repo: " + req.body.jid + - + req.body.repo)
        return res.status(200).json({
            success: true,
            job_id: jobId
        });
    });

    app.listen(5000, () => console.log(`Hey there! I'm listening. \n 
    HTTP: http://localhost:5000 \n 
    KUE: http://localhost:5000/api/kue-api/`));

    app.use(express.static('webroot'));
    app.use('/apidocs', express.static('apidocs'));

    worker.init();
}

module.exports = {
    bootstrap
}