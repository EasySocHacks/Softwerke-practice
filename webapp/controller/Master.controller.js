sap.ui.define([
    "sap/ui/core/mvc/Controller", 
    'sap/ui/core/format/DateFormat',
    'sap/ui/unified/DateTypeRange',
    'sap/ui/unified/CalendarLegendItem',
    "sap/m/MessageToast",
], function (Controller, DateFormat, DateTypeRange, CalendarLegendItem, Toast) {
    "use strict";

    let vacationDaysCount = 0;
    let vacationCount = 0;
    let vacationWithAtLeastFourteenDaysCount = 0;

    const specialDaysTypeArray = ["Type18", "Type02", "Type05", "Type10"];
    const legendDaysTypeText = [
        "Перенесенный выходной день",
        "Государственный праздник или выходной день",
        "Рабочий и сокращенный день",
        "Рабочий день (суббота/воскресенье)"
    ];

    const dateFormat = DateFormat.getInstance({pattern: "dd.MM.yyyy"});
    const dateFormatYYYY = DateFormat.getInstance({pattern: "yyyy"});
    const dateFormatMM = DateFormat.getInstance({pattern: "MM"});
    const dateFormatDD = DateFormat.getInstance({pattern: "dd"});

    const vacationTableModel = new sap.ui.model.json.JSONModel();

    return Controller.extend("itmo2021calendareny.controller.Master", {
        currentYear: null,

        onAfterRendering: function() {
            this.getView().byId("page").scrollTo(0);
        },

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

                        let i = -1;
                        while (oModel.getProperty("/days/day/" + (++i) + "/@d")) {
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

            for (let i = 0; i < 4; i++) {
                legend.addItem(new CalendarLegendItem({
                    text: legendDaysTypeText[i],
                    type: specialDaysTypeArray[i]
                }));
            }
        },

        onAddVacation: function() {
            const calendar = this.byId("calendar");

            if (!calendar.getSelectedDates()[0]) {
                Toast.show("Выделите период, чтобы добавить отпуск");
                return;
            }

            const startDate = calendar.getSelectedDates()[0].getStartDate();
            const endDate = calendar.getSelectedDates()[0].getEndDate();

            if (!endDate) {
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
            const holidaysBetween = calendar.getSpecialDates().filter(
                specialDate =>
                    !(specialDate.getStartDate() < startDate || specialDate.getStartDate() > endDate) &&
                    (specialDate.getType() === specialDaysTypeArray[0] || 
                    specialDate.getType() === specialDaysTypeArray[1])
            ).length;

            let isOverlapping = false;

            vacationTableModel.getProperty("/list").forEach(item => {
                const itemStartDate = dateFormat.parse(item["startDate"]);
                const itemEndDate = dateFormat.parse(item["endDate"]);

                if (!(itemEndDate < startDate || itemStartDate > endDate)) {
                    Toast.show("Даты отпусков не должны пересекаться");

                    isOverlapping = true;
                    return;
                }
            });

            if (isOverlapping) {
                return;
            }

            this.checkVacationRulesOnAdd(daysBetween - holidaysBetween);

            this.addRowToVacationTable(startDateString, endDateString, daysBetween, daysBetween - holidaysBetween);

            calendar.removeAllSelectedDates();
        },

        addRowToVacationTable: function(startDate, endDate, fullDays, workingDays) {
            const newData = vacationTableModel.getProperty("/list");
            newData.push({
                "startDate": startDate.toString(),
                "endDate": endDate.toString(),
                "fullDays": fullDays.toString(),
                "workingDays": workingDays.toString()
            });

            vacationTableModel.setData({"list": newData});
        },

        onConfirmVacation: function() {
            if (this.byId("checkBoxSumDays").getSelected() &&
                this.byId("checkBoxVacationCount").getSelected() &&
                this.byId("checkBoxLongestVacationDuration").getSelected()) {
                this.changeVacationTableToolsVisible(false);
            } else {
                Toast.show("Все условия должны быть выполнены");
            }
        },

        sorterComparator : function(firstDate, secondDate) {
            const firstStartDate = dateFormat.parse(firstDate);

            const secondStartDate = dateFormat.parse(secondDate);

            return firstStartDate - secondStartDate;
        },

        onDelete: function(oEvent) {
            const rowCells = oEvent.getSource().getParent().getCells();
            const startDateText = rowCells[0].getText();
            const endDateText = rowCells[1].getText();
            const fullDaysText = rowCells[2].getText();
            const workingDaysText = rowCells[3].getText();

            const newData = vacationTableModel.getProperty("/list").filter(
                function(value) {
                    return !(
                        startDateText === value["startDate"] &&
                        endDateText === value["endDate"] &&
                        fullDaysText === value["fullDays"] &&
                        workingDaysText === value["workingDays"]
                    );
                }
            );

            vacationTableModel.setData({"list": newData});

            const daysWithoutHolidaysBetween = parseInt(workingDaysText);

            this.checkVacationRulesOnDelete(daysWithoutHolidaysBetween);
        }, 

        onFixVacation: function() {
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
        },

        checkVacationRulesOnDelete: function(daysWithoutHolidaysBetween) {
            this.checkVacationRules(false, daysWithoutHolidaysBetween);
        },

        checkVacationRulesOnAdd: function(daysWithoutHolidaysBetween) {
            this.checkVacationRules(true, daysWithoutHolidaysBetween);
        },

        checkVacationRules: function(previosOperationType, daysWithoutHolidaysBetween) {
            vacationCount += previosOperationType ? 1 : -1;
            vacationDaysCount += previosOperationType ? daysWithoutHolidaysBetween : -daysWithoutHolidaysBetween;

            if ((vacationCount > 4 && previosOperationType) || (vacationCount <= 4 && !previosOperationType)) {
                this.byId("checkBoxVacationCount").setSelected(!previosOperationType);
            }

            if ((vacationDaysCount > 28 && previosOperationType) || (vacationDaysCount <= 28 && !previosOperationType)) {
                this.byId("checkBoxSumDays").setSelected(!previosOperationType);
            }

            if (daysWithoutHolidaysBetween >= 14) {
                vacationWithAtLeastFourteenDaysCount += previosOperationType ? 1 : -1;
                
                const checkBoxLongestVacationDuration = this.byId("checkBoxLongestVacationDuration");
                if (previosOperationType) {
                    checkBoxLongestVacationDuration.setSelected(true);
                } else {
                    if (vacationWithAtLeastFourteenDaysCount === 0) {
                        checkBoxLongestVacationDuration.setSelected(false);
                    }
                }
            }
        }
    });
});