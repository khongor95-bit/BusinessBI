const menuBtn=document.getElementById('menuBtn');
const navLinks=document.querySelector('.nav-links');
if(menuBtn){menuBtn.addEventListener('click',()=>{menuBtn.classList.toggle('open');navLinks.classList.toggle('open');});}

const io=new IntersectionObserver((entries)=>{
  entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});
},{threshold:.12});
document.querySelectorAll('.reveal').forEach((el,i)=>{
  el.style.transitionDelay=(i%4)*60+'ms';
  io.observe(el);
});
