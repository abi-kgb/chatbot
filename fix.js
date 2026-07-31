const fs = require('fs');
const path = require('path');
const srcDir = path.join('d:', 'chatbox', 'frontend', 'src');

const files = ['Sidebar.jsx', 'ProfileSettings.jsx', 'ContactInfo.jsx', 'ChatWindow.jsx', 'CallHistorySidebar.jsx'];

files.forEach(file => {
  const filePath = path.join(srcDir, 'components', file);
  let code = fs.readFileSync(filePath, 'utf8');
  
  if (!code.includes('getMediaUrl')) {
    code = code.replace(/import api from '\.\.\/api';/g, "import api, { getMediaUrl } from '../api';");
  }

  code = code.replace(/chat\.avatar\.startsWith\('http'\) \? chat\.avatar : `http:\/\/localhost:8000\$\{chat\.avatar\}`/g, 'getMediaUrl(chat.avatar)');
  code = code.replace(/getOtherParticipant\(chat\.participants\)\.avatar\.startsWith\('http'\) \? getOtherParticipant\(chat\.participants\)\.avatar : `http:\/\/localhost:8000\$\{getOtherParticipant\(chat\.participants\)\.avatar\}`/g, 'getMediaUrl(getOtherParticipant(chat.participants).avatar)');
  code = code.replace(/user\.avatar\.startsWith\('http'\) \? user\.avatar : `http:\/\/localhost:8000\$\{user\.avatar\}`/g, 'getMediaUrl(user.avatar)');
  code = code.replace(/avatar\.startsWith\('http'\) \? avatar : `http:\/\/localhost:8000\$\{avatar\}`/g, 'getMediaUrl(avatar)');
  code = code.replace(/member\.user\.avatar\.startsWith\('http'\) \? member\.user\.avatar : `http:\/\/localhost:8000\$\{member\.user\.avatar\}`/g, 'getMediaUrl(member.user.avatar)');
  code = code.replace(/fileUrl\.startsWith\('http'\) \? fileUrl : `http:\/\/localhost:8000\$\{fileUrl\}`/g, 'getMediaUrl(fileUrl)');
  code = code.replace(/otherParticipant\.avatar\.startsWith\('http'\) \? otherParticipant\.avatar : `http:\/\/localhost:8000\$\{otherParticipant\.avatar\}`/g, 'getMediaUrl(otherParticipant.avatar)');
  code = code.replace(/targetUser\.avatar\.startsWith\('http'\) \? targetUser\.avatar : `http:\/\/localhost:8000\$\{targetUser\.avatar\}`/g, 'getMediaUrl(targetUser.avatar)');

  fs.writeFileSync(filePath, code);
  console.log('Updated ' + file);
});
