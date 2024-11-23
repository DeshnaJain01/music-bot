const TelegramBot = require('node-telegram-bot-api');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

const token = '7660399624:AAEfWl2ol6R6QN2DHY_i8VYlzOtws9J8uvs'; // Replace with your bot token
const bot = new TelegramBot(token, { polling: true });

console.log('Bot is starting...');

const downloadAudio = async (url, retries = 5) => {
    try {
        console.log('Getting video info...');
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title.replace(/[^a-zA-Z0-9]/g, '_');
        const tempFilePath = path.resolve(__dirname, `${title}.mp3`);
        const tempCompressedFilePath = path.resolve(__dirname, `${title}_compressed.mp3`);

        console.log('Starting download...');
        console.log('Temp file path:', tempFilePath);
        console.log('Compressed file path:', tempCompressedFilePath);

        return new Promise((resolve, reject) => {
            const stream = ytdl(url, {
                filter: 'audioonly',
                quality: 'highestaudio'
            })
                .pipe(fs.createWriteStream(tempFilePath));

            stream.on('finish', () => {
                console.log('Download finished, starting compression...');
                ffmpeg(tempFilePath)
                    .audioBitrate(128)
                    .toFormat('mp3')
                    .on('start', (commandLine) => {
                        console.log('FFmpeg started:', commandLine);
                    })
                    .on('progress', (progress) => {
                        console.log('FFmpeg processing:', progress.percent, '% done');
                    })
                    .on('end', () => {
                        console.log('Compression completed, preparing to send file...');
                        try {
                            fs.unlinkSync(tempFilePath);
                            console.log('Original file deleted successfully');
                        } catch (err) {
                            console.error('Error deleting original file:', err);
                        }
                        resolve(tempCompressedFilePath);
                    })
                    .on('error', (err) => {
                        console.error('Compression error:', err);
                        try {
                            fs.unlinkSync(tempFilePath);
                            console.log('Original file deleted after error');
                        } catch (unlinkErr) {
                            console.error('Error deleting original file:', unlinkErr);
                        }
                        reject(err);
                    })
                    .save(tempCompressedFilePath);
            });

            stream.on('error', (err) => {
                console.error('Download error:', err);
                if (retries > 0) {
                    console.log(`Retrying... Attempts left: ${retries}`);
                    downloadAudio(url, retries - 1).then(resolve).catch(reject);
                } else {
                    reject(err);
                }
            });
        });
    } catch (error) {
        console.error('Failed to download audio:', error.message);
        throw new Error('Failed to download audio: ' + error.message);
    }
};
