
RPMBUILD ?= $(PWD)/rpmbuild
VERSION=0.9.1
NAME=redhat-access-plugin-ipa
FULLNAME=$(NAME)-$(VERSION)
TARBALL=v$(VERSION).tar.gz
distdir=dist/$(FULLNAME)
DESTDIR ?= /usr/share
plugindir=$(DESTDIR)/ipa/ui/js/plugins/rhaccess
jsfiles=assets/angular.min.js \
        assets/redhat_access_angular_ui.js

js:
	mkdir -p $(distdir)
	cp rhaccess.js $(distdir)/rhaccess.js
	rm -f $(distdir)/rhaccess-deps.js
	for f in $(jsfiles); do (cat "$${f}"; echo) >> $(distdir)/rhaccess-deps.js; done

css:
	mkdir -p $(distdir)/styles
	cat assets/styles/redhat_access_angular_ui-embedded-images.css > $(distdir)/styles/rhaccess.css
	echo ' ' >> $(distdir)/styles/rhaccess.css
	cat assets/styles/glyphicons.css >> $(distdir)/styles/rhaccess.css
	echo ' ' >> $(distdir)/styles/rhaccess.css
	cat rhaccess.css >> $(distdir)/styles/rhaccess.css

glyphs:
	mkdir -p $(distdir)/fonts
	cp fonts/* $(distdir)/fonts/

all: lint js css glyphs

lint:
	jsl -conf jsl.conf

clean:
	rm -rf dist

install:
	install -d $(plugindir)
	install -d $(plugindir)/styles
	install -d $(plugindir)/fonts
	install -p -m 644 $(distdir)/*.js $(plugindir)
	install -p -m 644 $(distdir)/styles/* $(plugindir)/styles
	install -p -m 644 $(distdir)/fonts/* $(plugindir)/fonts

tarball:
	mkdir -p dist/tarballs/
	mkdir -p dist/sources/$(FULLNAME)
	rsync -av --exclude dist ./* dist/sources/$(FULLNAME)/
	cd dist/sources && tar cfz ../tarballs/$(TARBALL) $(FULLNAME)/*
	rm -rf dist/sources/$(FULLNAME)

rpmroot:
	rm -rf $(RPMBUILD)
	mkdir -p $(RPMBUILD)/BUILD
	mkdir -p $(RPMBUILD)/RPMS
	mkdir -p $(RPMBUILD)/SOURCES
	mkdir -p $(RPMBUILD)/SPECS
	mkdir -p $(RPMBUILD)/SRPMS

rpmdistdir:
	mkdir -p dist/rpms
	mkdir -p dist/srpms

rpms: tarball rpmroot rpmdistdir
	cp dist/tarballs/$(TARBALL) $(RPMBUILD)/SOURCES/.
	rpmbuild --define "_topdir $(RPMBUILD)" -ba $(NAME).spec
	cp $(RPMBUILD)/RPMS/*/*.rpm dist/rpms/
	cp $(RPMBUILD)/SRPMS/*.src.rpm dist/srpms/
	rm -rf $(RPMBUILD)
