// Copyright (c) 2018, Team010 and contributors
// For license information, please see license.txt
var Quagga_init,
    $scan_barcode;

//filter incident with status open and assign to employee
frappe.ui.form.on('Job Sheet', 'onload', function(frm) {
    var assign_fields = ['assign_to', 'assign_to_2', 'assign_to_3', 'assign_to_4'];

    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'Incident',
            filters: { docstatus: 0 },
            fields: ['name', 'docstatus'].concat(assign_fields)
        },
        callback: function (val) {
            var filters = [
                    ['Incident', 'docstatus', '=', 0]
                ],
                incs = [],
                curr_emp = cur_frm.doc.employee;

            ((val && val.message) || []).forEach(function (doc) {
                assign_fields.forEach(function (field) {
                    if (doc && doc[field] && doc[field] === curr_emp) { incs.push(doc.name); }
                });
            });

            if (incs.length) { filters.push(['Incident', 'name', 'in', incs]); }

            cur_frm.set_query("incident", function() {
                return {
                    filters: filters,
                    order_by: 'docname'
                };
            });
        }
    });
});


frappe.ui.form.on('Job Sheet', {
    validate: function (frm) {
        //total time cannot be zero
        if (frm.doc.total_time.trim() == '0 hour 0 minutes') {
            frappe.validated = false;
            frappe.throw({
                title: "Please fill in timeseheet.",
                message: "Total time cannot be zero."
            });
        }
    },
	refresh: function(frm) {
	    var $scan_barcode = $('div[data-fieldname="machine_bar_code"] button[data-fieldname="machine_bar_code"]');

	    if (frm.doc.docstatus === 0) {
            //set curr date
            frappe.model.set_value(frm.doctype, frm.docname, 'date', frappe.datetime.get_today());

            //add Quagga library
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js').then(function () {
                $scan_barcode.attr('disabled', false);
            })
        }
	},
    time_in: updateTotalTime,
    time_out: updateTotalTime,
    time_break: updateTotalTime,
	incident: function (frm) {
		var defaults = {
                temp_mileage: null,
                temp_cost_per_mileage: null,
				contact_person: null,
				mobile: null,
                issue_desc: null
            };

		//get incident name
		if (frm.doc.incident) {
			queryDoctype('Incident', { name: frm.doc.incident }).then(function (data) {
                var doc = {},
                    new_doc = {};

                if (data.message) { doc = data.message; }
                Object.keys(defaults).forEach(function (key) {
                    new_doc[key] = doc[key] === '' ? defaults[key] : doc[key];
                });

                set_multiple(frm.doctype, frm.docname, new_doc);
            });
		}
		else { set_multiple(frm.doctype, frm.docname, defaults); }
    },
    machine_bar_code: function (frm) {
	    var $machine_code = $('div[data-fieldname="machine_bar_code"]'),
            handler;

	    if (Quagga && !Quagga.error) {
            Quagga.init({
                inputStream: {
                    type: 'LiveStream',
                    target: $machine_code[0]
                },
                decoder: {
                    readers: ['code_128_reader']
                },
                locator: {
                    halfSample: true,
                    patchSize: 'medium'
                },
                locate: true,
                numOfWorkers: 2
            }, function(err) {
                if (err) { console.error(err); return; }
                Quagga.start();
                $machine_code.find('video').css('width', '100%');
                $machine_code.find('canvas').css('display', 'none');
            });

	        handler = Quagga.onDetected(function (result) {
	            var code = result && result.codeResult && result.codeResult.code;

	            //after detected code
	            if (code) {
	                console.log(result);
	                queryDoctype('Item', { name: code }).then(function (data) {
                        var doc;

                        if (data.message) { doc = data.message; }
                        if (doc) { //if doc exist, set machine item
                            Quagga.stop();
	                        set_multiple(frm.doctype, frm.docname, { machine_item: code });
                        }
                    });
                }
            });
        }
    }
});

// frappe.ui.form.on('Time Sheet', {
//     timesheet_add: function (frm, cdt, cdn) {
//     	var row = frappe.get_doc(cdt, cdn),
//             mileage = frm.doc.temp_mileage,
//             defaults = {
//     	        date: frappe.datetime.get_today(),
//                 toll: 0,
//                 employee: frm.doc.employee,
//                 mileage_distance: mileage
//             };
//
//         //set curr date
//         set_multiple(row.doctype, row.name, defaults);
//
//         updateTotalHours(frm, cdt, cdn); //update total hours for rows
//         updateTotalToll(frm); //update total toll
//         updateTotalMileage(frm); //update total mileage
//     },
//     timesheet_remove: function(frm, cdt, cdn) {
//         updateTotalToll(frm); //update total toll
//         updateTotalMileage(frm); //update total mileage
//     },
// 	mileage_distance: updateMileage,
//     mileage_cost: updateTotalMileage,
//     toll: updateTotalToll
// });

// frappe.ui.form.on('Check In', {
//     check_in_remove: updateTotalTime,
//     check_out: function (frm, cdt, cdn) {
//         var row = frappe.get_doc(cdt, cdn);
//
//         frappe.model.set_value(row.doctype, row.name, 'time_end', frappe.datetime.now_time());
//     },
//     time_end: function (frm, cdt, cdn) {
//         var row = frappe.get_doc(cdt, cdn),
//             start = new Date(frappe.datetime.now_date() + ' ' + row.time_start),
//             end = new Date(frappe.datetime.now_date() + ' ' + row.time_end),
//             msec = end.getTime() - start.getTime(),
//             hh,
//             mm,
//             ss;
//
//         hh = Math.floor(msec / 1000 / 60 / 60);
//         msec -= hh * 1000 * 60 * 60;
//
//         mm = Math.floor(msec / 1000 / 60);
//         msec -= mm * 1000 * 60;
//
//         frappe.model.set_value(row.doctype, row.name, 'time_total', hh + ' hrs ' + mm + ' min');
//     },
//     time_total: updateTotalTime
// });

//update multiple values in model
function set_multiple(doctype, docname, obj) {
    Object.keys(obj).forEach(function (key) { frappe.model.set_value(doctype, docname, key, obj[key]); });
}

// //update mileage
// function updateMileage(frm, cdt, cdn) {
//     var row = frappe.get_doc(cdt, cdn),
//         mileage = row.mileage_distance,
//         cost = frm.doc.temp_cost_per_mileage;
//
//     set_multiple(row.doctype, row.name, { mileage_cost:  mileage * cost || 0 });
// }

function updateTotalTime(frm) {
    var doc = frm.doc,
        total = {hrs: 0, min: 0},
        time_break = getBreak(doc.time_break),
        split_in = doc.time_in.split(':'),
        split_out = doc.time_out.split(':'),
        sum;

    //totals in minutes
    split_in = (parseInt(split_in[0]) * 60) + parseInt(split_in[1]);
    split_out = (parseInt(split_out[0]) * 60) + parseInt(split_out[1]);
    sum = split_out - split_in - time_break;

    //get back in hrs and minutes
    total.hrs = parseInt(sum / 60);
    total.min = sum % 60;

    if (total.hrs < 0) { total.hrs = 0; }
    if (total.min < 0) { total.min = 0; }

    set_multiple(frm.doctype, frm.docname, { total_time: total.hrs + ' hour ' + total.min + ' minutes' });

    function getBreak(time_break) {
        var total = 0,
            split;

        time_break = time_break.replace(' minutes');
        split = time_break.split(' hour');
        total += parseInt(split.pop()) || 0; //get minutes

        if (split.length ) { //get hours
            split[0] = parseInt(split[0]) || 0;
            total += split[0] * 60;
        }

        return total;
    }
}

// function updateTotalTime(frm) {
//     var rows = frm.doc.check_in,
//         msec = 0,
//         hh = 0,
//         mm = 0;
//
//     if (rows.length) {
//         rows.forEach(function (row) {
//             var time_total = row.time_total || '',
//                 split = time_total.split(' hrs '),
//                 h = (split[0] || 0) * 3600000,
//                 m = ((split[1] || '').replace(' min', '') || 0) * 60000,
//                 msec = h + m;
//
//             hh += Math.floor(msec / 1000 / 60 / 60);
//             msec -= hh * 1000 * 60 * 60;
//
//             mm += Math.floor(msec / 1000 / 60);
//             msec -= mm * 1000 * 60;
//         });
//
//         //if more than 60, pass to hours
//         hh += Math.floor(mm / 60);
//         mm = mm % 60;
//
//         frappe.model.set_value(frm.doctype, frm.docname, { total_time: hh + ' hrs ' + mm + ' min' });
//     }
//     else {
//         set_multiple(frm.doctype, frm.docname, { total_time: '0 hrs 0 min' });
//     }
// }

// //update mileage
// function updateMileage(frm, cdt, cdn) {
//     var row = frappe.get_doc(cdt, cdn),
//         mileage = row.mileage_distance,
//         cost = frm.doc.temp_cost_per_mileage;
//
//     set_multiple(row.doctype, row.name, { mileage_cost:  mileage * cost || 0 });
// }
//
// //update total toll
// function updateTotalToll(frm) {
//     var item = frm.doc.timesheet || [],
//         total = item.reduce(function(total, item) { return total + parseFloat(item.toll) || 0; }, 0);
//
//     frappe.model.set_value(frm.doctype, frm.docname, 'total_toll', total);
// }
//
// //update total mileage
// function updateTotalMileage(frm) {
//     var item = frm.doc.timesheet || [],
//         total = item.reduce(function(total, item) { return total + parseFloat(item.mileage_cost) || 0; }, 0);
//
//     frappe.model.set_value(frm.doctype, frm.docname, 'total_mileage', total);
// }

function loadScript(url){
    var script = document.createElement("script")
    script.type = "text/javascript";

    return new Promise(function (resolve) {
        if (script.readyState){  //IE
            script.onreadystatechange = function(){
                if (script.readyState == "loaded" || script.readyState == "complete"){
                    script.onreadystatechange = null;
                    resolve();
                }
            };
        } else {  //Others
            script.onload = resolve;
        }

        script.src = url;
        document.getElementsByTagName("head")[0].appendChild(script);
    });
}