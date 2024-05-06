const fileService = require('../services/fileService')
const fs = require('fs')
const path = require('path')
const User = require('../models/User')
const File = require('../models/File')

class fileController {
   async createDir(req, res) {
      try {
         const { name, type, parent } = req.body
         const file = new File({ name, type, parent, user: req.user.id })
         const parentFile = await File.findOne({ _id: parent })
         if (!parentFile) {
            file.path = name
            await fileService.createDir(file)
         } else {
            file.path = `${parentFile.path}\\${file.name}`
            await fileService.createDir(file)
            parentFile.children.push(file._id)
            await parentFile.save()
         }
         await file.save()
         return res.json(file)
      } catch (e) {
         console.log(e)
         return res.status(400).json(e)
      }
   }
   async getFiles(req, res) {
      try {
         const { sort } = req.query
         let files
         switch (sort) {
            case 'name':
               files = await File.find({ user: req.user.id, parent: req.query.parent })
               files.sort((a, b) => a.name.localeCompare(b.name))
               break
            case 'size':
               files = (await File.find({ user: req.user.id, parent: req.query.parent }).sort({ size: -1 }))
               break
            case 'date':
               files = (await File.find({ user: req.user.id, parent: req.query.parent }).sort({ date: -1 }))
               break
            default:
               files = await File.find({ user: req.user.id, parent: req.query.parent })
               break
         }
         return res.json(files)
      } catch (e) {
         console.log(e)
         return res.status(500).json({ message: 'Can not get files' })
      }
   }
   async uploadFile(req, res) {
      try {
         const file = req.files.file
         const parent = await File.findOne({ user: req.user.id, _id: req.body.parent })
         const user = await User.findOne({ _id: req.user.id })
         if (user.usedSpace + file.size > user.diskSpace) {
            return res.status(400).json({ message: 'There is no space on the disk' })
         }
         user.usedSpace = user.usedSpace + file.size
         let filePath
         if (parent) {
            filePath = path.join(`${__dirname}\\..\\files\\${user._id}\\${parent.path}\\${file.name}`)
         } else {
            filePath = path.join(`${__dirname}\\..\\files\\${user._id}\\${file.name}`)
         }
         if (fs.existsSync(filePath)) {
            return res.status(400).json({ message: 'File already exists' })
         }
         file.mv(filePath)

         const type = file.name.split('.').pop()
         let dbFilePath = file.name
         if (parent) {
            dbFilePath = `${parent.path}\\${file.name}`
         }
         const dbFile = new File({
            name: file.name,
            type,
            size: file.size,
            path: dbFilePath,
            parent: parent ? parent._id : null,
            user: user._id
         })
         await dbFile.save()
         await user.save()
         res.json(dbFile)
      } catch (e) {
         console.log(e)
         return res.status(500).json({ message: 'Upload error' })
      }
   }
   async downloadFile(req, res) {
      try {
         const file = await File.findOne({ _id: req.query.id, user: req.user.id })
         const filePath = path.join(`${__dirname}\\..\\files\\${req.user.id}\\${file.path}`)
         if (fs.existsSync(filePath)) {
            return res.download(filePath, file.name)
         }
         return res.status(400).json({ message: 'Download error' })
      } catch (e) {
         return res.status(500).json({ message: 'Download error' })
      }
   }
   async deleteFile(req, res) {
      try {
         const file = await File.findOne({ _id: req.query.id, user: req.user.id })
         const user = await User.findOne({ _id: req.user.id })
         if (!file) {
            return res.status(400).json({ message: 'File not found' })
         }
         fileService.deleteFile(file)
         await file.deleteOne()
         user.usedSpace = user.usedSpace - file.size
         await user.save()
         return res.json({ message: 'File was deleted' })
      } catch (e) {
         console.log(e)
         return res.status(400).json({ message: 'Dir is not empty' })
      }
   }
}

module.exports = new fileController()