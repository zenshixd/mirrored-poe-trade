#!/usr/bin/env bash
npm version patch
VERSION=$(jq -r '.version' package.json)
echo Pushing version "$VERSION"
rm ../package-lock.json

bun run build
aws ecr get-login-password --region eu-central-1 | docker login --username AWS --password-stdin 032544014746.dkr.ecr.eu-central-1.amazonaws.com
docker build -t mirrored-poe-trade .
docker tag mirrored-poe-trade:latest "032544014746.dkr.ecr.eu-central-1.amazonaws.com/mirrored-poe-trade:$VERSION"
docker tag mirrored-poe-trade:latest "032544014746.dkr.ecr.eu-central-1.amazonaws.com/mirrored-poe-trade:latest"
docker push "032544014746.dkr.ecr.eu-central-1.amazonaws.com/mirrored-poe-trade:$VERSION"
docker push "032544014746.dkr.ecr.eu-central-1.amazonaws.com/mirrored-poe-trade:latest"