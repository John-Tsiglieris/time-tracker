/*
PDFdocument = require('pdfkit'); // depreceated line
const chart = require('chart.js');

//const {PDFdocument} = require('pdfkit');



function buildPDF(dataCallback, endCallback) {
    const doc = new PDFdocument();
    doc.on('data', dataCallback);
    doc.on('end', endCallback);  
    //doc.font('fonts/PalatinoBold.ttf');
    doc.fontSize(25);
    doc.text('Some text with an embedded font!', 100, 100);
    doc.end();
}

module.exports = {buildPDF};
*/
const {pool, fetchActivities}  = require('../db'); // Import the database connection
const PDFDocument = require('pdfkit');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas'); // wrapper around canvas for Chart.js
const canvas = require('canvas'); // for some reason omitting this works locally, but without this the deployed version breaks

const width = 512;  // canvas width
const height = 512; // canvas height

const chartCanvas = new ChartJSNodeCanvas({ width, height });

async function buildPDF(data, dataCallback, endCallback) {
    const doc = new PDFDocument();
    doc.on('data', dataCallback);
    //doc.text('Todo: Retrieve total hours for the week \n Get all projects and their time contribution \n get all activities and their respective time', 100, 75);
    //doc.text('1. formulate an sql query of all activities, calculate total time, do project stuff after', 100, 125);
    doc.on('end', endCallback);

    let activityNames = [];
    let activityTimes = [];
    let activityPercentages = [];
    let totalTime = 0;
    let activityStart = null;
    let activityEnd = null;

    console.log("Data to be incuded in PDF: ", data);
    data.forEach(data => {
        activityNames.push(data.activityName);
        const activityStart = new Date(data.start);
        const activityEnd = new Date(data.end);
        console.log("data.start: ", data.start);
        console.log("activityStart: ", activityStart);
        console.log("activityEnd: ", activityEnd);
        const elapsedMs = activityEnd - activityStart;
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        activityTimes.push(elapsedSeconds);

        totalTime += (elapsedSeconds);

      });

    activityTimes.forEach(time => {
        const percentage = time / totalTime * 100;
        activityPercentages.push(percentage);
    });

    console.log("activityNames: ", activityNames);
    console.log("activityTimes: ", activityTimes);
    

      // TODO: Calculate total time for all activities, get elapsed time for each activity
      /*
        const start = new Date('2025-03-08T07:16:48.841Z');
        const end = new Date('2025-03-08T07:17:01.289Z');

        const elapsedMs = end - start; // milliseconds
        const seconds = Math.floor(elapsedMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        console.log(`${minutes}m ${remainingSeconds}s`); // Output: 0m 12s
        */
    
    const centerTextPlugin = {
        id: 'centerText',
        beforeDraw: (chart) => {
            const { width, height, ctx } = chart;
            ctx.save();
            ctx.font = 'bold 20px sans-serif';
            ctx.fillStyle = 'black'; // Or any color
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Activities', width / 2, height / 2);
            ctx.restore();
        }
    };

    /*
    // Generate chart as image buffer
    const chartBuffer = await chartCanvas.renderToBuffer({
        type: 'doughnut',
        data: {
            labels: ['Random Test', 'B', 'C', 'D', 'E', 'F'],
            datasets: [{
                data: [28, 25, 19, 12, 11, 1],
                backgroundColor: ['#8e24aa', '#1e88e5', '#424242', '#d81b60', '#757575', '#bdbdbd'],
            }],
        },
        options: {
            plugins: {
                legend: { display: true },
            },
            cutout: '30%',
        },
        plugins: [centerTextPlugin]
    });
    */

    const chartBuffer = await chartCanvas.renderToBuffer({
        type: 'doughnut',
        data: {
            labels: activityNames,
            datasets: [{
                data: activityPercentages,
                backgroundColor: ['#8e24aa', '#1e88e5', '#424242', '#d81b60', '#757575', '#bdbdbd'],
            }],
        },
        options: {
            plugins: {
                legend: { display: true },
            },
            cutout: '30%',
        },
        plugins: [centerTextPlugin]
    });
    

    // Add text and chart to the PDF
    doc.fontSize(25).text('Project Breakdown', 100, 50);
    doc.image(chartBuffer, 100, 150, { width: 150 });
    doc.end();
}


module.exports = { buildPDF };