import "./CreditsPage.css";

const CreditsPage = () => {
  return (
    <div className="all-credits">
    <h1>CREDITS</h1>
    <div className="credits">
      <div>
        <a href="https://www.linkedin.com/in/alex-park-/">
          <img className="pfp" src="alex.jpeg" alt="" width="240" height="300" />
        </a>
        <div>Alex Park</div>
        <div>park.ale@northeastern.edu</div>
      </div>
      <div>
        <a href="https://www.linkedin.com/in/aidenrim/">
          <img className="pfp" src="aiden.jpg" alt="arim" width="240" height="300" />
        </a>
        <div>Aiden Rim</div>
        <div>rim.a@northeastern.edu</div>
      </div>
      <div>
        <a href="https://www.linkedin.com/in/bryanli27/">
          <img className="pfp" src="bryan.jpeg" alt="bryali" width="240" height="300" />
        </a>
        <div>Bryan Li</div>
        <div>li.brya@northeastern.edu</div>
      </div>
      <div>
        <a href="https://www.linkedin.com/in/colinchu4/">
          <img className="pfp" src="colin.jpg" alt="colchu" width="240" height="300" />
        </a>
        <div>Colin Chu</div>
        <div>chu.col@northeastern.edu</div>
      </div>
    </div></div>
  );
};

export default CreditsPage;
