sap.ui.define([
    "sap/ui/core/mvc/Controller", 
    'sap/ui/core/format/DateFormat',
    'sap/ui/core/library',
    'sap/ui/unified/DateTypeRange',
    'sap/ui/core/TooltipBase',
    'sap/ui/unified/CalendarLegend',
    'sap/ui/unified/CalendarLegendItem',
    "sap/m/Text",
    "sap/m/ColumnListItem",
    "sap/m/Button",
    "sap/m/MessageToast"
], function (Controller, DateFormat, coreLibrary, DateTypeRange, TooltipBase, 
            CalendarLegend, CalendarLegendItem, Text, ColumnListItem, Button, Toast) {
    "use strict";

    const CalendarType = coreLibrary.CalendarType;
    const specialDaysTypeArray = ["Type18", "Type02", "Type05", "Type10"];
    const dayOfWeekNameToInt = {
        "пн": 0,
        "вт": 1,
        "ср": 2,
        "чт": 3,
        "пт": 4,
        "сб": 5,
        "вс": 6,
    };

    return Controller.extend("itmo2021calendareny.controller.Calendar", {
        oFormatYyyy: null,
        currentYear: null,

        onInit: function() {
            this.oFormatYyyy = DateFormat.getInstance({pattern: "yyyy", calendarType: CalendarType.Gregorian});
            this.currentYear = this.oFormatYyyy.format(new Date());

            const calendar = this.byId("calendar");
            
            calendar.displayDate(new Date(this.currentYear, 0, 1));

            fetch("https://raw.githubusercontent.com/xmlcalendar/data/72a9c34dcb65d2a955eddb1e97809cb84198b9fa/ru/2021/calendar.xml")
                    .then(response => response.text())
                    .then(str => (new window.DOMParser()).parseFromString(str, "text/xml"))
                    .then(data => {
                        const oModel = new sap.ui.model.xml.XMLModel();
                        oModel.setData(data);
                        this.getView().setModel(oModel);

                        for (let i = 0; i < 366; i++) {
                            const dateString = oModel.getProperty("/days/day/" + i + "/@d");
                            const dateArray = dateString.split(".");
                            const mounthString = dateArray[0];
                            const dayString = dateArray[1];

                            let specialDayType = 
                                specialDaysTypeArray[parseInt(oModel.getProperty("/days/day/" + i + "/@t"))];

                            if (oModel.getProperty("/days/day/" + i + "/@f")) {
                                specialDayType = specialDaysTypeArray[0]
                            }

                            const dateTypeRange = new DateTypeRange({
                                startDate: new Date(this.currentYear, parseInt(mounthString) - 1, parseInt(dayString)),
                                type: specialDayType
                            });

                            if (oModel.getProperty("/days/day/" + i + "/@h")) {
                                const holidayId = parseInt(oModel.getProperty("/days/day/" + i + "/@h")) - 1;

                                dateTypeRange.setAggregation("tooltip", 
                                    oModel.getProperty("/holidays/holiday/" + holidayId + "/@title"));
                            }

                            if (oModel.getProperty("/days/day/" + i + "/@f")) {
                                const holidayFromDate = oModel.getProperty("/days/day/" + i + "/@f");

                                dateTypeRange.setAggregation("tooltip", "Перенесен с " + holidayFromDate);
                            }

                            calendar.addSpecialDate(dateTypeRange);
                        }
                    });

            const legend = this.byId("calendarLegend");

            legend.addItem(new CalendarLegendItem({
                text: "Перенесенный выходной день",
                type: specialDaysTypeArray[0]
            }));

            legend.addItem(new CalendarLegendItem({
                text: "Государственный праздник или выходной день",
                type: specialDaysTypeArray[1]
            }));

            legend.addItem(new CalendarLegendItem({
                text: "Рабочий и сокращенный день",
                type: specialDaysTypeArray[2]
            }));

            legend.addItem(new CalendarLegendItem({
                text: "Рабочий день (суббота/воскресенье)",
                type: specialDaysTypeArray[3]
            }));
        },

        onAddVacation: function(oEvent) {
            const calendar = this.byId("calendar");
            const dateFormatYYYY = DateFormat.getInstance({pattern: "yyyy", calendarType: CalendarType.Gregorian});
            const dateFormatMM = DateFormat.getInstance({pattern: "MM", calendarType: CalendarType.Gregorian});
            const dateFormatDD = DateFormat.getInstance({pattern: "dd", calendarType: CalendarType.Gregorian});
            const dateFormatEE = DateFormat.getInstance({pattern: "EE", calendarType: CalendarType.Gregorian});

            if (calendar.getSelectedDates()[0] == undefined) {
                Toast.show("Выделите период, чтобы добавить отпуск");
                return
            }

            const startDate = calendar.getSelectedDates()[0].getStartDate();
            const endDate = calendar.getSelectedDates()[0].getEndDate();

            const startDateString = 
                dateFormatDD.format(startDate) + "." +
                dateFormatMM.format(startDate) + "." +
                dateFormatYYYY.format(startDate);

            const endDateString = 
                dateFormatDD.format(endDate) + "." +
                dateFormatMM.format(endDate) + "." +
                dateFormatYYYY.format(endDate);

            const daysBetweenInTime = Math.abs(startDate.getTime() - endDate.getTime());
            const daysBetween = Math.ceil(daysBetweenInTime / (1000 * 60 * 60 * 24)) + 1;
            let workingDaysBetween = daysBetween;

            calendar.getSpecialDates().forEach(
                specialDate => {
                    if (specialDate.getStartDate() < startDate || specialDate.getStartDate() > endDate) {
                        return;
                    }

                    const specialDayOfWeek = dateFormatEE.format(specialDate.getStartDate());
                    const isEndOfWeek = (specialDayOfWeek == "сб" || specialDayOfWeek == "вс");

                    if (specialDate.getType() == specialDaysTypeArray[0] && !isEndOfWeek) {
                        workingDaysBetween--;
                    }
                    
                    if (specialDate.getType() == specialDaysTypeArray[1] && !isEndOfWeek) {
                        workingDaysBetween--;
                    }

                    if (specialDate.getType() == specialDaysTypeArray[2] && isEndOfWeek) {
                        workingDaysBetween++;
                    }

                    if (specialDate.getType() == specialDaysTypeArray[3]) {
                        workingDaysBetween++;
                    }
                });

            let tmpDaysBetweenCounter = daysBetween

            const startDateDayOfWeek = dayOfWeekNameToInt[dateFormatEE.format(startDate)];

            for (let i = startDateDayOfWeek; tmpDaysBetweenCounter > 0; i = (i + 1) % 7, tmpDaysBetweenCounter--) {
                if (i == 5 || i == 6) {
                    workingDaysBetween--;
                }
            }

            this.addRowToVacationTable(startDateString, endDateString, daysBetween, workingDaysBetween);
        },

        addRowToVacationTable: function(startDate, endDate, fullDays, workingDays) {
            this.byId("table").addItem(new ColumnListItem({
                cells: [
                    new Text({text: startDate}),
                    new Text({text: endDate}),
                    new Text({text: fullDays}),
                    new Text({text: workingDays}),
                    new Button({
                        icon: "sap-icon://delete",
                        press: function(oEvent) {
                            //TODO: onDelete handler
                        }
                    })
                ]
            }));
        }
    });
});