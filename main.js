const electron = require('electron')
const ipcMain = require('electron').ipcMain
const mongojs = require('mongojs')

// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const path = require('path')
const url = require('url')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 800, height: 600, title: 'GIS Viewer'})
  mainWindow.maximize()

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

ipcMain.on('search:submit', (event, arg) => {
  let _weekDay = {
    'weekday': []
  }
  let _startHour;
  let _endHour;
  for (var key in arg) {
    if (arg.hasOwnProperty(key)) {
      var element = arg[key];
      if ( element.name == 'weekday' ) {
        _weekDay['weekday'].push(element.value)
      }
      if ( element.name == 'startHour' && element.value != '' ) _startHour = parseInt(element.value); 
      if ( element.name == 'endHour' && element.value != '' ) _endHour = parseInt(element.value); 
    }
  }
  
  let _query = {}
  if ( _startHour != undefined ) _query = { $gte: _startHour };
  console.log(_query);
  if ( _endHour != undefined ) _query = ( _startHour != undefined ) ? { $gte: _startHour, $lte: _endHour }: { $lte: _endHour };
  console.log(_query);

  console.log(_weekDay.weekday);
  let _match = {};
  let _weeks = { weekday: { "$in": _weekDay.weekday } };
  if ( _startHour != undefined || _endHour != undefined ) {
    _match = {
      '$match':{
        '$and':[_weeks, {hour: _query}]
      }
    };
    console.log(_match);
  } else {
    _match['$match'] = _weeks;
  }
  console.log(_match);

  var db = mongojs('127.0.0.1/gis');
  var collection = db.collection('user');
  collection.aggregate( [_match, { $group: { _id: { uuid: "$uuid" }, count: { $sum: "$count" } } }] , _query, function(error, users) {
    event.sender.send('search:reply', users)
    console.log(users.length);
  });

})