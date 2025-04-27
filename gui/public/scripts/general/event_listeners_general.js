const measurementIcon = document.getElementById('measurementBtn')
const historyIcon = document.getElementById('histBtn')
const settingsIcon = document.getElementById('settingsBtn')


measurementIcon.addEventListener('click',()=>{
  location.href = '/measurement'
})


historyIcon.addEventListener('click',()=>{
  location.href = '/history'
})

settingsIcon.addEventListener('click',()=>{
  location.href = 'http://raspberrypi:4001/'
})


