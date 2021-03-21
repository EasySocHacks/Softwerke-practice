sap.ui.define([
    "sap/ui/core/mvc/Controller", 
    'sap/ui/model/json/JSONModel',
    'sap/ui/core/format/DateFormat',
    'sap/ui/core/library'
], function (Controller, JSONModel, DateFormat, coreLibrary) {
    "use strict";

    var CalendarType = coreLibrary.CalendarType;

    return Controller.extend("itmo2021calendareny.controller.Calendar", {
        oFormatYyyy: null,
        currentYear: null,

        onInit: function() {
            this.oFormatYyyy = DateFormat.getInstance({pattern: "yyyy", calendarType: CalendarType.Gregorian});
            this.currentYear = this.oFormatYyyy.format(new Date());

            var calendar = this.byId("calendar");
            var startDate = new Date(this.currentYear, 0, 1)
            
            calendar.displayDate(new Date(this.currentYear, 0, 1));
        }
    });

});