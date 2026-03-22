#!/bin/bash
# This script runs when you hit the Publish button!

PROJECT="${GITHUB_USER}-${RepositoryName}"
DOMAIN="?"
CONFIRM="🚨 Deploy a Compute app for this repo in your Fastly account and publish your website content? (y/n) "

if [ ! $FASTLY_API_TOKEN ]; then 
    echo '⚠️ Grab a Fastly API key and add it your repo before deploying! Check out the README for steps. 📖' 
else 
    # check if we already have a service for this repo and if so find the domain
    readarray -t lines < <(npx --yes @fastly/cli service describe --service-name=${PROJECT} 2>/dev/null)
    IFS='   ' read -r -a array <<< "${lines[0]}"
    if [[ -n ${array[1]} ]]; then
        readarray -t lines < <(npx --yes @fastly/cli domain list --service-id=${array[1]} --version=latest)
        IFS='   ' read -r -a domains <<< "${lines[1]}"
        DOMAIN="https://${domains[2]}"
        CONFIRM="🚨 Update the content in your existing website at ${DOMAIN}? (y/n) "
    fi
    printf "${CONFIRM}"
    read answer
    if [ "$answer" != "${answer#[Yy]}" ]; then 
        npm run build
        # check for an existing app folder and if not create one
        if [ ! -d './deploy/_app' ]; then
            npx --yes @fastly/compute-js-static-publish@latest --root-dir=./deploy/_site --output=./deploy/_app --kv-store-name="${PROJECT}-content" --name="${PROJECT}"
        else 
            # if we have an app folder for a different repo (e.g. a fork) recreate the folder
            name=$(grep '^name' ./deploy/_app/fastly.toml | cut -d= -f2-)
            if [ $name != \"${PROJECT}\" ]; then 
                cd .. && rm -rf ./deploy/_app
                npx --yes @fastly/compute-js-static-publish@latest --root-dir=./deploy/_site --output=./deploy/_app --kv-store-name="${PROJECT}-content" --name="${PROJECT}"
            fi
        fi
        # check for a service id and if not deploy the app
        service=$(grep '^service_id' ./deploy/_app/fastly.toml | cut -d= -f2-)
        size=${#service}
        if ! [[ ${size} -gt 3 ]]; then
            cd ./deploy/_app
            npx --yes @fastly/cli compute publish --accept-defaults --auto-yes || { printf '\nOops! Something went wrong deploying your app.. 🤬\n'; exit 1; }
        fi
        # publish the updated content to the kv store and grab the domain
        cd ./deploy/_app
        npm run fastly:publish || { printf '\nOops! Something went wrong publishing your content.. 😭\n'; exit 1; }
        if [ "$DOMAIN" == "?" ]; then
            readarray -t lines < <(npx --yes @fastly/cli domain list --version=latest)
            IFS='   ' read -r -a array <<< "${lines[1]}"
            DOMAIN="https://${array[2]}"
        fi
        printf "\nWoohoo check out your site at ${DOMAIN} 🪩 🛼 🎏\n\n"
    else
        exit 1
    fi
fi 
