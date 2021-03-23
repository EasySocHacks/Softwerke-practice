sap.ui.define([
    "sap/ui/core/mvc/Controller", 
    'sap/ui/core/format/DateFormat',
    'sap/ui/core/library'
], function (Controller, DateFormat, coreLibrary) {
    "use strict";

    var CalendarType = coreLibrary.CalendarType;

    return Controller.extend("itmo2021calendareny.controller.Calendar", {
        oFormatYyyy: null,
        currentYear: null,

        onInit: function() {
            this.oFormatYyyy = DateFormat.getInstance({pattern: "yyyy", calendarType: CalendarType.Gregorian});
            this.currentYear = this.oFormatYyyy.format(new Date());

            var calendar = this.byId("calendar");
            
            calendar.displayDate(new Date(this.currentYear, 0, 1));
        }/*,

        onAfterRendering: function() {
            var calendar = this.byId("calendar");
            var header = calendar.getAggregation("header");

            //Somehow doesn't work
            header.setVisibleButton1(false);

            header.attachPressNext(function(oEvent) {
                //mEventRegistry.press = undefined
                //The problem is to get an existing handler from a new one or
                //to get it from an external source => this way we need a link to the button.
                //Instead this we got just a functions to manipulate with this buttons...
                //
                //This code allows us to detach current attached function, despite this we still have no info,
                // how to get an initial one...
                header.detachPressNext(oEvent.getSource().mEventRegistry.press[0].fFunction);

                //Here we would be detach current handler and attach a new handler to shift 12 months:
                //Increment(Decrement to previous button) this.currentYear and do calendar.displayDate.
            });
        }*/
    });

});