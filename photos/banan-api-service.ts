export class CentralaApiService {
  private readonly apikey = process.env.PERSONAL_API_KEY;

  async startConversation() {
    const response = await fetch(`${process.env.HQ_URL}/report`, {
      method: "POST",
      body: JSON.stringify({
        task: "photos",
        apikey: this.apikey,
        answer: "START",
      }),
    });
    const result = await response.json();
    return result;
  }

  async modifyPhoto(action: string, fileName: string) {
    const response = await fetch(`${process.env.HQ_URL}/report`, {
      method: "POST",
      body: JSON.stringify({
        task: "photos",
        apikey: this.apikey,
        answer: `${action} ${fileName}`,
      }),
    });
    const result = await response.json();
    return result;
  }
}
