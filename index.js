const fs = require('fs');
const vorpal = require('vorpal')();


var db = {};

db._dbpath = 'det2feel.json';

db._data = undefined;

db._load = function () {
  db._data = JSON.parse(fs.readFileSync(db._dbpath));
}

db._save = function () {
  fs.writeFileSync(db._dbpath, JSON.stringify(db._data));
}

db.init = function () {
  db._load();
}

db.getFeelingList = function () {
  return db._data.feelings;
}

db.getDetectionList = function () {
  var detectionList = [];
  
  for (var detection in db._data.detections) {
    if (db._data.detections.hasOwnProperty(detection)) {
      detectionList.push(detection);
    }
  }

  return detectionList;
}

db.getIncompleteDetectionList = function () {
  var detectionList = [];
  
  for (var detection in db._data.detections) {
    if (db._data.detections.hasOwnProperty(detection)) {
      for (var i=0; i<db._data.feelings.length; ++i) {
        var feeling = db._data.feelings[i];
        if (!db._data.detections[detection].hasOwnProperty(feeling)) {
          detectionList.push(detection);
          break;
        }
      }
    }
  }

  return detectionList;
}

db.getFeelingValues = function (detection) {
  return db._data.detections[detection];
}

db.getIncompleteFeelingList = function (detection) {
  var feelingList = [];

  for (var i=0; i<db._data.feelings.length; ++i) {
    var feeling = db._data.feelings[i];
    if (!db._data.detections[detection].hasOwnProperty(feeling)) {
      feelingList.push(feeling);
    }
  }

  return feelingList;
}

db.updateFeelingValue = function (detection, feeling, val) {
  db._data.detections[detection][feeling] = val;
  var sum = 0;
  db._save();
  return db.getFeelingValues(detection);
}


var cli = {};

cli._appname = 'D2FMan';

cli._registerHandler_show = function () {
  vorpal
    .command('show <key>', 'Output the requested information (key: feelings, detections, todo/incomplete).')
    .action(function(args, callback) {
      switch (args.key) {
        case 'feelings': {
          var feelingList = db.getFeelingList();
          for (var i=0; i<feelingList.length; ++i) {
            this.log('  ' + '[' + i + '] ' + feelingList[i]);
          }
        } break;

        case 'detections': {
          var detectionList = db.getDetectionList();
          for (var i=0; i<detectionList.length; ++i) {
            this.log('  ' + '[' + i + '] ' + detectionList[i]);
          }
        } break;

        case 'todo':
        case 'incomplete': {
          var detectionList = db.getIncompleteDetectionList();
          for (var i=0; i<detectionList.length; ++i) {
            this.log('  ' + '[' + i + '] ' + detectionList[i]);
          }
        } break;

        default: {
          this.log('unknown key ' + args.key);
        } break;
      }

      callback();
    });
}

cli._feel = function (detection) {
  var feelings = db.getFeelingList();
  var feelingValues = db.getFeelingValues(detection);
  for (var i=0; i<feelings.length; ++i) {
    var feeling = feelings[i];
    var val = feelingValues.hasOwnProperty(feeling) ? feelingValues[feeling] : '(?)';
    console.log('  ' + feeling + ': ' + val);
  }
}

cli._registerHandler_feel = function () {
  vorpal
    .command('feel <detection>', 'Output the feelings of a detection.')
    .action(function(args, callback) {
      if (args.detection && db.getFeelingValues(args.detection)) {
        cli._feel(args.detection);
      } else {
        this.log('unknown detection ' + args.detection);
      }

      callback();
    });
}

cli._registerHandler_update = function () {
  vorpal
    .command('update <detection> <feeling> <val>', 'Update a kind of feeling for a detection.')
    .action(function(args, callback) {
      if (args.detection && args.feeling && args.val !== undefined &&
          db.getDetectionList().indexOf(args.detection) >= 0 &&
          db.getFeelingList().indexOf(args.feeling) >= 0) {
        db.updateFeelingValue(args.detection, args.feeling, parseFloat(args.val));
        cli._feel(args.detection);
      } else {
        this.log('unknown detection ' + args.detection);
      }

      callback();
    });
}

cli._registerHandler_complete = function () {
  vorpal
    .command('complete <detection> [feelingValues...]', 'Complete the feelings for a detection.')
    .action(function(args, callback) {
      if (args.detection && db.getDetectionList().indexOf(args.detection) >= 0 &&
          args.feelingValues &&  
          args.feelingValues.length == db.getFeelingList().length) {
        var feelings = db.getFeelingList();
        for (var i=0; i<feelings.length; ++i) {
          var feeling = feelings[i];
          var val = args.feelingValues[i];
          db.updateFeelingValue(args.detection, feeling, val);
        }
        cli._feel(args.detection);
      } else {
        this.log('invalid command');
      }

      callback();
    });
}

cli._testDetections = function (detectionList) {
  var feelingValues = {};
  var feelingList = db.getFeelingList();
  for (var i=0; i<feelingList.length; ++i) {
    var feeling = feelingList[i];
    feelingValues[feeling] = 0;
    for (var j=0; j<detectionList.length; ++j) {
      var detection = detectionList[j];
      feelingValues[feeling] += db.getFeelingValues(detection)[feeling];
    }
  }
  return feelingValues;
}

cli._registerHandler_test = function () {
  vorpal
    .command('test [detections...]', 'Test feeling detections.')
    .action(function(args, callback) {
      if (args.detections && args.detections.length > 0) {
        var feelingValues = cli._testDetections(args.detections);
        for (var feeling in feelingValues) {
          console.log('  ' + feeling + ': ' + feelingValues[feeling]);
        }
      } else {
        this.log('invalid command');
      }

      callback();
    });
}

cli.registerHandlers = function () {
  cli._registerHandler_show();
  cli._registerHandler_feel();
  cli._registerHandler_update();
  cli._registerHandler_complete();
  cli._registerHandler_test();
}

cli.launch = function () {
  cli.registerHandlers();

  vorpal
    .delimiter(cli._appname + '$')
    .show();
}


var app = {};

app.launch = function () {
  db.init();
  cli.launch();
}

app.launch();
