const Papa = require('papaparse')
const fs = require('fs')
const multer = require('multer')
const pako = require('pako')

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, '../uploads')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})

const upload = multer({ storage: storage })

module.exports = (req, res) => {
  upload.single('csv')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading.
    } else if (err) {
      // An unknown error occurred when uploading.
    }

    fs.readFile(pako.ungzip(req.file.path), { encoding: 'utf8' }, (err, data) => {
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
}