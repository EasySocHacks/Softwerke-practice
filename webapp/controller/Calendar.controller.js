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
    "sap/m/MessageToast",
    "sap/ui/model/Sorter"
], function (Controller, DateFormat, coreLibrary, DateTypeRange, TooltipBase, 
            CalendarLegend, CalendarLegendItem, Text, ColumnListItem, Button, Toast, Sorter) {
    "use strict";

    let vacationDaysCount = 0;
    let vacationCount = 0;
    let vacationWithAtLeastFourteenDaysCount = 0;

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

    const dateFormat = DateFormat.getInstance({pattern: "dd.MM.yyyy", calendarType: CalendarType.Gregorian});
    const dateFormatYYYY = DateFormat.getInstance({pattern: "yyyy", calendarType: CalendarType.Gregorian});
    const dateFormatMM = DateFormat.getInstance({pattern: "MM", calendarType: CalendarType.Gregorian});
    const dateFormatDD = DateFormat.getInstance({pattern: "dd", calendarType: CalendarType.Gregorian});
    const dateFormatEE = DateFormat.getInstance({pattern: "EE", calendarType: CalendarType.Gregorian});

    const vacationTableModel = new sap.ui.model.json.JSONModel();

    return Controller.extend("itmo2021calendareny.controller.Calendar", {
        currentYear: null,
        
        onInit: function() {
            this.getView().setModel(vacationTableModel, "vacation");            
            vacationTableModel.setData({"list": []});

            this.currentYear = dateFormatYYYY.format(new Date());

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

            if (calendar.getSelectedDates()[0] == undefined) {
                Toast.show("Выделите период, чтобы добавить отпуск");
                return;
            }

            const startDate = calendar.getSelectedDates()[0].getStartDate();
            const endDate = calendar.getSelectedDates()[0].getEndDate();

            if (endDate == null) {
                Toast.show("Выделите период, чтобы добавить отпуск");
                return;
            }

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
            let holidaysBetween = 0;

            calendar.getSpecialDates().forEach(
                specialDate => {
                    if (specialDate.getStartDate() < startDate || specialDate.getStartDate() > endDate) {
                        return;
                    }

                    if (specialDate.getType() == specialDaysTypeArray[0] || 
                    specialDate.getType() == specialDaysTypeArray[1]) {
                        holidaysBetween++;
                    }
                });

            let isOverlapping = false;

            this.byId("table").getItems().forEach(item => {
                const itemStartDate = dateFormat.parse(item.getAggregation("cells")[0].getText());
                const itemEndDate = dateFormat.parse(item.getAggregation("cells")[1].getText());

                if (!(itemEndDate < startDate || itemStartDate > endDate)) {
                    Toast.show("Даты отпусков не должны пересекаться");

                    isOverlapping = true;
                    return;
                }
            });

            if (isOverlapping) {
                return;
            }

            vacationCount++;

            if (vacationCount > 4) {
                this.byId("checkBoxVacationCount").setSelected(false);
            }

            vacationDaysCount += (daysBetween - holidaysBetween);

            if (vacationDaysCount > 28) {
                this.byId("checkBoxSumDays").setSelected(false);
            }

            if (daysBetween - holidaysBetween >= 14) {
                vacationWithAtLeastFourteenDaysCount++;
                this.byId("checkBoxLongestVacationDuration").setSelected(true);
            }

            this.addRowToVacationTable(startDateString, endDateString, daysBetween, daysBetween - holidaysBetween);

            calendar.removeAllSelectedDates();
        },

        addRowToVacationTable: function(startDate, endDate, fullDays, workingDays) {
            const newData = vacationTableModel.getProperty("/list");
            newData.push({
                "startDate": startDate,
                "endDate": endDate,
                "fullDays": fullDays,
                "workingDays": workingDays
            });

            vacationTableModel.setData({"list": newData});
        },

        onConfirmVacation: function(oEvent) {
            if (this.byId("checkBoxSumDays").getSelected() == true &&
                this.byId("checkBoxVacationCount").getSelected() == true &&
                this.byId("checkBoxLongestVacationDuration").getSelected() == true) {
                this.changeVacationTableToolsVisible(false);
            } else {
                Toast.show("Все условия должны быть выполнены");
            }
        },

        sorterComparator : function(firstDate, secondDate) {
            const firstStartDate = dateFormat.parse(firstDate);

            const secondStartDate = dateFormat.parse(secondDate);

            if (firstStartDate < secondStartDate) {
                return -1;
            } else if (firstStartDate > secondStartDate) {
                return 1;
            } else {
                return 0;
            }
        },

        onDelete: function(oEvent) {
            const calendar = this.byId("calendar");

            const rowCells = oEvent.getSource().getParent().getCells();
            const startDateText = rowCells[0].getText();
            const endDateText = rowCells[1].getText();
            const fullDaysText = rowCells[2].getText();
            const workingDaysText = rowCells[3].getText();

            const newData = vacationTableModel.getProperty("/list").filter(
                function(value) {
                    return !(
                        startDateText == value["startDate"] &&
                        endDateText == value["endDate"] &&
                        fullDaysText == value["fullDays"] &&
                        workingDaysText == value["workingDays"]
                    );
                }
            );

            vacationTableModel.setData({"list": newData});

            const checkBoxSumDays = this.byId("checkBoxSumDays");
            const checkBoxVacationCount = this.byId("checkBoxVacationCount");
            const checkBoxLongestVacationDuration = this.byId("checkBoxLongestVacationDuration");

            const daysWithoutHolidaysBetween = parseInt(workingDaysText);

            vacationCount--;

            if (vacationCount <= 4) {
                checkBoxVacationCount.setSelected(true);
            }

            vacationDaysCount -= daysWithoutHolidaysBetween;

            if (vacationDaysCount <= 28) {
                checkBoxSumDays.setSelected(true);
            }
            
            if (daysWithoutHolidaysBetween >= 14) {
                vacationWithAtLeastFourteenDaysCount--;

                if (vacationWithAtLeastFourteenDaysCount == 0) {
                    checkBoxLongestVacationDuration.setSelected(false);
                }
            }
        }, 

        onFixVacation: function(oEvent) {
            this.changeVacationTableToolsVisible(true);
        },

        changeVacationTableToolsVisible(isVisible) {
            this.byId("addVacationButton").setVisible(isVisible);
            this.byId("confirmVacationButton").setVisible(isVisible);
            this.byId("checkBoxSumDays").setVisible(isVisible);
            this.byId("checkBoxVacationCount").setVisible(isVisible);
            this.byId("checkBoxLongestVacationDuration").setVisible(isVisible);
            this.byId("table").getItems().forEach(item =>
                item.getAggregation("cells")[4].setEnabled(isVisible));
            this.byId("fixVacationButton").setVisible(!isVisible);
        }
    });
});