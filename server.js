const express = require('express')
const Papa = require('papaparse')
const bodyParser = require('body-parser')
const multer = require('multer')
const fs = require('fs')
const app = express()
const port = 3001

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})

const upload = multer({ storage: storage })

const isFollowRule = (item, rule) => {
  const rowValue = item[rule.field];

  switch (rule.type) {
    case 'equalTo': {
      const regex = rule.sensitive ? new RegExp('^' + rule.toMatch + '$') : new RegExp('^' + rule.toMatch + '$', 'i')
      return regex.test(rowValue)
    }
    case 'startsWith': {
      const regex = rule.sensitive ? new RegExp('^' + rule.toMatch) : new RegExp('^' + rule.toMatch, 'i')
      return regex.test(rowValue)
    }
    case 'endsWith': {
      const regex = rule.sensitive ? new RegExp(rule.toMatch + '$') : new RegExp(rule.toMatch + '$', 'i')
      return regex.test(rowValue)
    }
    case 'contains': {
      let regex = `${rule.toMatch.join('|')}`;
      regex = rule.sensitive ? new RegExp(regex, 'g') : new RegExp(regex, 'ig')
      return regex.test(rowValue)
    }
    case 'regex': {
      let regex = rule.toMatch;
      regex = regex[0] === '/' ? regex.substr(1) : regex;
      regex = regex[regex.length - 1] === '/' ? regex.substr(0, regex.length - 1) : regex;
      regex = rule.sensitive ? new RegExp(regex, 'g') : new RegExp(regex, 'ig')

      return regex.test(rowValue)
    }
    case 'exclude': {
      let regex = `${rule.toMatch.join('|')}`;
      regex = rule.sensitive ? new RegExp(regex, 'g') : new RegExp(regex, 'ig')
      return regex.test(rowValue)
    }
    case 'equalOrGreaterThan': {
      const rowValueNumber = parseFloat(rowValue, 10)
      return !isNaN(rowValue) && rowValueNumber >= rule.toMatch ? true : false
    }
    case 'equalOrLessThan': {
      const rowValueNumber = parseFloat(rowValue, 10)
      return !isNaN(rowValue) && rowValueNumber <= rule.toMatch ? true : false
    }
    case 'between': {
      const rowValueNumber = parseFloat(rowValue, 10)
      return !isNaN(rowValue) && rowValueNumber > rule.min && rowValueNumber < rule.max ? true : false
    }
    default:
      return false;
  }
}

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())

app.post('/filter', (req, res) => {
  const config = req.body.filters;
  const fileName = req.body.fileName;

  fs.readFile(`./uploads/${fileName}`, { encoding: 'utf8' }, (err, data) => {
    if (err) return res.status(500).send(err)

    const dataParsed = Papa.parse(data, {
      header: true,
      skipEmptyLines: true,
      download: false,
      delimitersToGuess: [',', '\t', '|', ';', Papa.RECORD_SEP, Papa.UNIT_SEP],
    });

    const filteredData = dataParsed.data.filter((item) => {
      const isValid = [];
      config.map((rule) => {
        isValid.push(isFollowRule(item, rule))
      })
      return !isValid.includes(false)
    })

    return res.status(200).json(filteredData)
  });
})


app.post('/upload', upload.single('csv'), (req, res) => {
  console.log(req.file.path)
  fs.readFile(req.file.path, { encoding: 'utf8' }, (err, data) => {
    if (err) return res.status(500).send(err)

    const result = Papa.parse(data, {
      header: true,
      skipEmptyLines: true,
      download: false,
      delimitersToGuess: [',', '\t', '|', ';', Papa.RECORD_SEP, Papa.UNIT_SEP],
    });

    return res.status(200).json(result)
  });
})

app.listen(port, () => console.log(`App listening on port ${port}!`))