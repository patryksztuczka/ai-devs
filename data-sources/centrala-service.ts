export class CentralaService {
  async getLocationsByVisitor(visitorName: string) {
    const response = await fetch(`${process.env.HQ_URL}/people`, {
      method: "POST",
      body: JSON.stringify({
        apikey: process.env.PERSONAL_API_KEY,
        query: visitorName.toUpperCase(),
      }),
    });

    const data = await response.json();

    return data as {
      code: number;
      message: string;
    };
  }

  async getVisitorsByLocation(locationName: string) {
    const response = await fetch(`${process.env.HQ_URL}/places`, {
      method: "POST",
      body: JSON.stringify({
        apikey: process.env.PERSONAL_API_KEY,
        query: locationName.toUpperCase(),
      }),
    });

    const data = await response.json();

    return data as {
      code: number;
      message: string;
    };
  }
}
