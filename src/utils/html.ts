class DocumentHandler {
  content = "";

  text(text: Text) {
    this.content += text.text;
  }
}

/***
 * Takes some a string of HTML, and returns a string of that HTML's text.
 * In other words, it strips HTML tags.
 * **Note however, that it also includes the inner content of potentially
 * unexpected tags (e.g. <script> and <style>)
 */
export const html = async (htmlContent: string): Promise<string> => {
  const documentHandler = new DocumentHandler();
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const htmlRewriter = new HTMLRewriter().onDocument(documentHandler);
  const response = new Response(htmlContent);
  await htmlRewriter.transform(response).text();
  return documentHandler.content;
};
