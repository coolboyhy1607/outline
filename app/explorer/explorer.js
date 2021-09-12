// @flow
import { observer } from "mobx-react";
import { HomeIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Switch, Route, Link } from "react-router-dom";
import { Action } from "components/Actions";
import Empty from "components/Empty";
import Heading from "components/Heading";
import InputSearchPage from "components/InputSearchPage";
import LanguagePrompt from "components/LanguagePrompt";
import Scene from "components/Scene";
import Tab from "components/Tab";
import Tabs from "components/Tabs";
import PaginatedDocumentList from "../components/PaginatedDocumentList";
import useStores from "../hooks/useStores";
import NewDocumentMenu from "menus/NewDocumentMenu";
import { client } from "utils/ApiClient";

export default function Explorer() {
  const { explorer, ui, auth } = useStores();
  console.log(auth.user);
  auth.fetch();
  const { t } = useTranslation();
  const Login = React.lazy(() =>
    import(/* webpackChunkName: "login" */ "scenes/Login")
  );
  return (
    <Scene
      icon={<HomeIcon color="currentColor" />}
      title={t("Explorer")}
      actions={
        <>
          <Action>
            <Link to="login">Go to Home</Link>
          </Action>
        </>
      }
    >
      {!ui.languagePromptDismissed && <LanguagePrompt />}
      {/* <div>
        <h1>{dataPost[1].title}</h1>
        <p>{dataPost[1].text}</p>
      </div> */}
      {/* <h1>{posts}</h1> */}
      <Tabs>
        <Tab to="/" exact>
          {t("Recently viewed")}
        </Tab>
      </Tabs>
      <Switch>
        <Route path="/">
          <PaginatedDocumentList
            documents={explorer.recentlyUpdated}
            fetch={explorer.fetchRecentlyUpdated}
            empty={<Empty>{t("Weird, this shouldn’t ever be empty")}</Empty>}
            showCollection
          />
        </Route>
        <Route path="home" component={Login} />
      </Switch>
    </Scene>
  );
}
