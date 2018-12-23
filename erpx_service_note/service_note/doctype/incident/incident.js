// Copyright (c) 2018, Team010 and contributors
// For license information, please see license.txt

var job_sheets = [];

frappe.ui.form.on('Incident', {
    before_submit: function (frm) {
        var job_sheet_not_submit = [];

        //No job sheets found
        if (job_sheets.length === 0) {
            frappe.validated = false;
            frappe.throw({
                title: "No Job Sheet found.",
                message: "Please create job sheet for this incident."
            });
        }

        //Few job sheets not submitted
        job_sheets.forEach(function (job_sheet) {
            if (job_sheet.docstatus === 0) { job_sheet_not_submit.push(job_sheet); }
        });

        if (job_sheet_not_submit.length) {
            frappe.validated = false;
            frappe.throw({
                title: "Job Sheets not submitted.",
                message: "Please submit all job sheets to submit incident"
            });
        }
    },
	refresh: function(frm) {
        var temp;

        //set curr date only if new doc
        if (frm.doc.docstatus === 0) {
            frappe.model.set_value(frm.doctype, frm.docname, 'date', frappe.datetime.get_today());
        }

        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Job Sheet',
                filters: { incident: frm.docname },
                fields: ['naming_series', 'docstatus']
            },
            callback: function (val) {
                console.log(val);
                if (val && val.message) { job_sheets = val.message; }
            }
        });
    },
	customer: function (frm) {
        var name = frm.doc.customer,
            defaults = {
                temp_mileage: 0,
                temp_cost_per_mileage: 0
            };

        // //set customer mileage and cost per mileage
        // if(name) {
        //     queryDoctype('Customer', { name: frm.doc.customer }).then(function (data) {
        //             var doc;
        //
        //             if (data.message) { doc = data.message; }
        //             if (doc) {
        //                 defaults.temp_mileage = doc.mileage || 0;
        //                 defaults.temp_cost_per_mileage = doc.cost_per_mileage || 0;
        //
        //                 set_multiple(frm.doctype, frm.docname, defaults);
        //             }
        //     })
        //     frappe.call({
        //         method: 'frappe.client.get',
        //         args: { doctype: 'Customer', name: frm.doc.customer },
        //         callback: function (data) {
        //
        //         }
        //     });
        // }
        // else { set_multiple(frm.doctype, frm.docname, defaults); }
    }
});

//update multiple values in model
function set_multiple(doctype, docname, obj) {
    Object.keys(obj).forEach(function (key) { frappe.model.set_value(doctype, docname, key, obj[key]); });
}