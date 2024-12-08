const reports = [
  `<h1>Strategic Market Expansion Analysis</h1>
   <p>Our comprehensive analysis of the target market reveals significant growth opportunities in the Asia-Pacific region. Key findings include:</p>
   <ul>
     <li>Projected market size of $2.5 billion by 2025</li>
     <li>Rising middle-class population driving demand for premium products</li>
     <li>Favorable regulatory environment for foreign investments</li>
   </ul>
   <p>We recommend a phased entry strategy, starting with e-commerce channels and gradually expanding to physical retail presence.</p>`,

  `<h1>Digital Transformation Roadmap</h1>
   <p>To stay competitive in the rapidly evolving digital landscape, we propose the following initiatives:</p>
   <ol>
     <li>Implement cloud-based ERP system to streamline operations</li>
     <li>Develop a mobile app to enhance customer engagement</li>
     <li>Invest in AI-powered analytics for data-driven decision making</li>
   </ol>
   <p>Expected outcomes include a 30% increase in operational efficiency and a 25% boost in customer satisfaction scores.</p>`
]

export function generateRandomReport(): string {
  const randomIndex = Math.floor(Math.random() * reports.length)
  return reports[randomIndex]
}

