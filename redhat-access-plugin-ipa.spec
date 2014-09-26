%global plugin_dir %{_datadir}/ipa/ui/js/plugins/rhaccess

Name:       redhat-access-plugin-ipa
Version:    0.9.1
Release:    1%{?dist}
Summary:    Plugin for Identity Management to allow access Red Hat subscriber services
Vendor:     Red Hat, Inc.
Group:      System Environment/Base
License:    Apache License 2.0
URL:        https://github.com/redhataccess/redhat-access-plugin-ipa
Source0:    https://github.com/redhataccess/redhat-access-plugin-ipa/archive/v%{version}.tar.gz
BuildArch:  noarch

%description
This package contains the Red Hat Access Identity Management Plugin.
The Red Hat Access Identity Management Plugin provides web based access to
Red Hat's subscriber services.
These services include, but are not limited to,
access to knowledge-base solutions, case management,
automated diagnostic services, etc.

%prep
%setup -q

%build
make js css glyphs

%install
make install DESTDIR=%{buildroot}%{_datadir}

%files
%{plugin_dir}
%doc AUTHORS LICENSE README.md

%changelog
* Mon Jul 14 2014 Petr Vobornik <pvoborni@redhat.com> - 0.9.1-1
- initial package
