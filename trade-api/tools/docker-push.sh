#!/usr/bin/env bash
set -ex
VERSION=$(bun tools/bump.ts patch)
jq ".version=\"$VERSION\"" package.json > package1.json
mv package1.json package.json
echo Pushing version "$VERSION"

bun run build
aws ecr get-login-password --region eu-central-1 | docker login --username AWS --password-stdin 032544014746.dkr.ecr.eu-central-1.amazonaws.com
docker build -t mirrored-poe-trade --progress=plain .

NEW_ECR_IMAGE="032544014746.dkr.ecr.eu-central-1.amazonaws.com/mirrored-poe-trade:$VERSION"
docker tag mirrored-poe-trade:latest "$NEW_ECR_IMAGE"
docker push "$NEW_ECR_IMAGE"

aws ssm put-parameter --overwrite --name /mirrored-poe-trade/updater-version --value $VERSION --type String --region eu-central-1
#aws ecs update-service --cluster "MirroredPoeTrade" --service "Updater" --force-new-deployment --region eu-central-1
#echo Waiting until Updater is stable ...
#aws ecs wait services-stable --cluster "MirroredPoeTrade" --services "Updater" --region eu-central-1
#echo Updater deploy done!