# README #

### What is this repository for? ###
API documentation across all repos mentioned in apidocs.json

### How do I get set up? ###

sudo apt-get install npm
sudo apt-get install redis-server

sudo npm install -g forever
sudo npm install -g redis-server

npm install

### Usage guidelines ###

 HTTP dashboard : localhost:5000/
 KUE status API : localhost:5000/api/kue-api/active

### File Formats ###
#### apidocs.json ####


    {
      "repository_name": "<repo-name>",
      "repository_path": "<git file path>",
      "name" : "<repo name>",
      "title": "<title>",
      "desc": "<description>",
      "version": "0.0.1",
      "branch": "master",
      "section": "DevOps",
      "sub_section": "Operations",
      "deprecated": false,
      "api_documentation": false,
      "language": "python",
      "elb_stack": "<Deployment stack info>"
    },
