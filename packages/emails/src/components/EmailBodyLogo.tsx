import RawHtml from "./RawHtml";
import Row from "./Row";

const CommentIE = ({ html = "" }) => <RawHtml html={`<!--[if mso | IE]>${html}<![endif]-->`} />;

const EmailBodyLogo = () => {
  const image = `https://fertilitymapper.com/assets/logo_small.svg`;

  return (
    <>
      <CommentIE
        html={`</td></tr></table><table align="center" border="0" cellpadding="0" cellspacing="0" class="" style="width:600px;" width="600" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"></td>`}
      />
      <div style={{ margin: "0px auto", maxWidth: 600 }}>
        <Row align="center" border="0" style={{ width: "100%" }}>
          <td
            style={{
              direction: "ltr",
              fontSize: "0px",
              padding: "0px",
              textAlign: "center",
            }}>
            <CommentIE
              html={`<table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td style="vertical-align:top;width:600px;" >`}
            />
            <div
              className="mj-column-per-100 mj-outlook-group-fix"
              style={{
                fontSize: "0px",
                textAlign: "left",
                direction: "ltr",
                display: "inline-block",
                verticalAlign: "top",
                width: "100%",
              }}>
              <Row border="0" style={{ verticalAlign: "top" }} width="100%">
                <td
                  align="center"
                  style={{
                    fontSize: "0px",
                    padding: "10px 25px",
                    paddingTop: "32px",
                    wordBreak: "break-word",
                  }}>
                  <Row border="0" style={{ borderCollapse: "collapse", borderSpacing: "0px" }}>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}>
                        <span
                          style={{
                            color: "#0b4736",
                            fontSize: "13px",
                            lineHeight: "18.2px",
                            fontWeight: "500",
                            marginRight: ".25rem",
                          }}>
                          Sent securely by
                        </span>
                        <a
                          href="https://fertilitymapper.com/"
                          target="_blank"
                          rel="noreferrer noopener"
                          style={{ display: "inline-block" }}>
                          <img
                            height="19"
                            src={image}
                            style={{
                              border: "0",
                              display: "block",
                              outline: "none",
                              textDecoration: "none",
                              height: "34px",
                              width: "90px",
                              fontSize: "13px",
                            }}
                            width="90"
                            alt=""
                          />
                        </a>
                      </div>
                    </td>
                  </Row>
                </td>
              </Row>
            </div>
            <CommentIE html="</td></tr></table>" />
          </td>
        </Row>
      </div>
    </>
  );
};

export default EmailBodyLogo;
