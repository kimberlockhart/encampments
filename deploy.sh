# Requires aws-cli installed and credentials configured.
aws s3 cp . s3://map.saintfrancischallenge.org --recursive --exclude ".*" --exclude "deploy.sh"  --acl public-read