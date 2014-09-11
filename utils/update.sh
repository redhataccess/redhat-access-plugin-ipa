#!/bin/bash

# Copy Red Hat Access Angular dependencies and a built version into
# appropriate directories

# script dir
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

ANG_DIR=$1
DEST=$DIR"/../"

if [[ ! $ANG_DIR ]] ; then
	echo "Specify Red Hat Access Angular Directory" 1>&2;
	echo "Usage: update.sh $ANGULAR_DIR" 1>&2;
	exit 1
fi

# Copy Third Party Files
cp $ANG_DIR/bower_components/angular/angular.min.js $DEST/assets/

# Copy Red Hat Access Angular Files
cp $ANG_DIR/dist/redhat_access_angular_ui.js $DEST/assets/
cp $ANG_DIR/dist/styles/redhat_access_angular_ui-embedded-images.css $DEST/assets/styles/
