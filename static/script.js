// Keep only latest alert
  const flashContainer = document.getElementById('flash-container');
  if (flashContainer) {
    const alerts = flashContainer.querySelectorAll('.alert');
    if (alerts.length > 1) {
      alerts.forEach((alert, index) => {
        if (index < alerts.length - 1) alert.remove();
      });
    }
  }

  // Auto-dismiss after 3 seconds
  setTimeout(() => {
    const alert = document.querySelector('.alert');
    if (alert) alert.style.display = 'none';
  }, 60000);

  function reloadCaptcha() {
    const captcha = document.getElementById('captchaImage');
    captcha.src = '/captcha_img?' + Date.now(); 
  }
