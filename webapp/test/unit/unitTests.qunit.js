/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"itmo_2021_calendar_eny/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
