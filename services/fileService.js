const fs = require('fs')
const File = require('../models/File')
const path = require('path')

class FileService {
   createDir(file) {
      const filePath = path.join(`${__dirname}\\..\\files\\${file.user}\\${file.path}`)
      return new Promise((resolve, reject) => {
         try {
            if (!fs.existsSync(filePath)) {
               fs.mkdirSync(filePath)
               return resolve({ message: 'File was created' })
            } else {
               return reject({ message: 'File already exist' })
            }
         } catch (e) {
            console.log(e)
            return reject({ message: 'File error' })
         }
      })
   }
   deleteFile(file) {
      const path = this.getPath(file)
      if (file.type === 'dir') {
         fs.rmdirSync(path)
      } else {
         fs.unlinkSync(path)
      }
   }
   getPath(file) {
      return path.join(`${__dirname}\\..\\files\\${file.user}\\${file.path}`)
   }
}

module.exports = new FileService()