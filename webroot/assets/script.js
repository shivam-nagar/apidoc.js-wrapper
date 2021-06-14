angular.module('docsApp', [])
    .controller('appController', function ($scope, $http, $window) {
        $scope = this;

        $scope.searchTerm = "";
        $scope.lastUpdate = "17-03-2020";
        $scope.allRepos = [];
        $scope.showDeprecated = false;
        $scope.showDocumentedOnly = true;
        $scope.randomVal = 0;
        $scope.repoBranches = {};
        $scope.scheduledJobs = {};
        $scope.reloader = true;
        $scope.showELB = (localStorage.getItem('ELB') == "true")

        $http.get('./api/api-docs-status').then(function (response) {
            $scope.status = response.data;
            combineResults();
        });
        $http.get('./api/api-docs').then(function (response) {
            $scope.apidocs = response.data;
            combineResults();
        });

        $scope.getTimeAgo = function(repo){
            return moment(repo.last_updated).fromNow();
        }

        $scope.isDocumentable = function(repo) {
            return repo.has_doc || (repo.api_documentation && !repo.deprecated)
        }

        combineResults = function () {
            if (!$scope.apidocs || !$scope.status) return;
            setLoader(false);
            $scope.allRepos = [];

            statusRepos = [];
            $scope.status.forEach((x) => {
                statusRepos.push(x.repository_name);
            });
            $scope.apidocs = $scope.apidocs.filter((x) => {
                return statusRepos.indexOf(x.repository_name) == -1;
            })
            // combine and get repos and sections
            $scope.allRepos = $scope.status.concat($scope.apidocs);
            $scope.allSections = {};
            $scope.allRepos.forEach((x) => {
                if ($scope.allSections[x.section])
                    $scope.allSections[x.section] += 1;
                else
                    $scope.allSections[x.section] = 1;

                if (x.branch !== 'master') {
                    $scope.repoBranches[x.repository_name] = x.branch;
                }
            })
        }

        setLoader = function(val) {
            $scope.loading=val;
        }
        setLoader(true);

        setRandomVal = function (val) {
            $scope.randomVal = Math.round(1 + Math.random() * 3);
        }
        setRandomVal();

        $scope.validReposInSection = function (sectionName) {
            return $scope.allRepos.filter((x) => {
                if (!sectionName) return $scope.showRepo(x);
                return sectionName == x.section && $scope.showRepo(x);
            });
        }

        $scope.getDocumentedRepos = function (sectionName) {
            return $scope.allRepos.filter((x) => {
                if (!sectionName) return x.has_doc;
                return sectionName == x.section && x.has_doc;
            });
        }

        $scope.getDeprecatedRepos = function (sectionName) {
            return $scope.allRepos.filter((x) => {
                if (!sectionName) return x.deprecated;
                return sectionName == x.section && x.deprecated;
            });
        }

        $scope.showRepo = function (repo) {
            if ($scope.searchTerm && $scope.searchTerm != "") {
                haystack = [repo.section, repo.name, repo.sub_section, repo.repository_name, repo.title, repo.desc].join('-').toLowerCase();
                return haystack.includes($scope.searchTerm.toLowerCase());
            }
            if ($scope.showDocumentedOnly)
                return $scope.isDocumentable(repo);
            return (!repo.deprecated || $scope.showDeprecated);
        }

        $scope.openPrompt = function (repo) {
            var response = $window.prompt("New branch/tag to build '" + repo.repository_name + "' documentation:", $scope.getRepoBranch(repo))
            if (response && response != "") {
                if (repo.branch != response) {
                    $scope.repoBranches[repo.repository_name] = response;
                    $scope.requestRepoRebuild(repo);
                } else {
                    delete $scope.repoBranches[repo.repository_name];
                }
            }
        }

        $scope.scheduledJobs = JSON.parse(localStorage.getItem('scheduledJobs')) || {};

        setInterval(() => {
            scope = angular.element(document.getElementsByTagName('body')).scope();
            scope.reloader = !scope.reloader;
            setTimeout(() => {
                scope.reloader = true;
            },0);
            scope.$apply();

            $scope.scheduledJobs = JSON.parse(localStorage.getItem('scheduledJobs')) || {};
            jobRepos = Object.keys($scope.scheduledJobs);
            if(jobRepos.length === 0) return;
            
            jobRepos.forEach((repo) => {
                x = $scope.scheduledJobs[repo];
                var url = "./api/kue-api/job/"+x.jobId;
                $http.get(url).
                then(function(response) {
                    data = response.data;
                    if(data.state == "complete"){
                        $scope.allRepos.forEach((y) => {
                            if(x.repoObj.repository_name == y.repository_name) {
                                y.branch = x.newBranch;
                                y.last_updated = (new Date()).getTime();
                                $scope.repoBranches[x.repoObj.repository_name] = x.newBranch;
                            }
                        });
                        delete($scope.scheduledJobs[repo]);
                        localStorage.setItem('scheduledJobs', JSON.stringify($scope.scheduledJobs));
                        location.reload();
                    } else if(data.state == "failed" || data.error){
                        alert(data.reason || 'Failed to generate documentation for '+ x.repoObj.repository_name)
                        delete($scope.scheduledJobs[repo]);
                        localStorage.setItem('scheduledJobs', JSON.stringify($scope.scheduledJobs));
                        location.reload();
                    }
                });
            });            
        }, 5000);

        $scope.requestRepoRebuild = function (repo, rebuild) {
            if(!rebuild && repo.branch == $scope.repoBranches[repo.repository_name]) {
                return;
            }
            var url = "./api/build-repo-docs";
            var parameter = JSON.stringify({ "repo" :repo.repository_name, "checkoutEntity": $scope.repoBranches[repo.repository_name] });
            $http.post(url, parameter).
            then(function(response) {
                data = response.data;
                if(data.success == true){
                    $scope.scheduledJobs[repo.repository_name] = {
                        repoObj : repo,
                        newBranch : $scope.repoBranches[repo.repository_name],
                        jobId : data.job_id
                    }
                    localStorage.setItem('scheduledJobs', JSON.stringify($scope.scheduledJobs));
                } else {
                    alert(data.reason || 'Unknown error occured')
                }
            });
        }


        $scope.getRepoBranch = function (repo) {
            return $scope.repoBranches[repo.repository_name] || repo.branch;
        }

    });

$(function () {
    'use strict'

    $('[data-toggle="offcanvas"]').on('click', function () {
        $('.offcanvas-collapse').toggleClass('open')
    })

});