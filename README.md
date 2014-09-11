redhat-access-plugin-ipa
========================

Red Hat Access Plug-in for IdM

# Test environment

To change Red Hat Access instance insert following lines into
`rhaccess.RHAApp.init_app`

```JavaScript
window.strata.setPortalHostname('access.my.instance.test');
window.strata.setAuthHostname('access.my.instance.test');
```

# Development

## Validate JavaScript

```
$ make lint
```

Runs jslint with `jsl.conf` configuration file.

## Build

```
$ make all
```

Prepares files in `dist\$(NAME)-$(VERSION)` directory, e.g.,
`redhat-access-plugin-ipa-1.0`. The content of this dir can be then copied
to IPA server into `/usr/share/ipa/ui/js/plugins/rhaccess` directory.

One can run also partial make targets: `js`, `css`, `glyphs`.

# Distribution

## Tarball

```
$ make dist
```

The output will be in `dist/tarballs` directory.

## RPM

```
$ make rpms
```

The built rpm will be in `dist/rpms` directory
