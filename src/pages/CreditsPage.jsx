import "./CreditsPage.css";
import { useLocation } from "react-router-dom";

const people = [
  {
    name: "Alex Park",
    email: "park.ale@northeastern.edu",
    href: "https://www.linkedin.com/in/alex-park-/",
    src: "alex.jpeg",
  },
  {
    name: "Aiden Rim",
    email: "rim.a@northeastern.edu",
    href: "https://www.linkedin.com/in/aidenrim/",
    src: "arim.png",
  },
  {
    name: "Bryan Li",
    email: "li.brya@northeastern.edu",
    href: "https://www.linkedin.com/in/bryanli27/",
    src: "bryan.jpeg",
  },
  {
    name: "Colin Chu",
    email: "chu.col@northeastern.edu",
    href: "https://www.linkedin.com/in/colinchu4/",
    src: "colin.jpg",
  },
];

const CreditsPage = () => {
  const { pathname } = useLocation();
  const Heading = pathname === "/credits" ? "h1" : "h2";

  return (
    <section
      id="credits"
      className={
        pathname === "/credits" ? "all-credits is-page" : "all-credits"
      }
    >
      <Heading>Credits</Heading>
      <p className="credits-intro">The people who built Critiqify.</p>
      <ul className="credits">
        {people.map((person) => (
          <li key={person.email}>
            <a
              href={person.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${person.name} on LinkedIn`}
            >
              <img
                className="pfp"
                src={person.src}
                alt=""
                width="240"
                height="300"
              />
            </a>
            <div className="person-name">{person.name}</div>
            <a className="person-email" href={`mailto:${person.email}`}>
              {person.email}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default CreditsPage;
