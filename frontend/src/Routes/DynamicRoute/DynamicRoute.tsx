import * as React from 'react';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { useExtensions } from '@console/plugin-sdk/src';
import { ErrorState } from '@redhat-cloud-services/frontend-components/ErrorState';
import { isRoutePage as isDynamicRoutePage, RoutePage as DynamicRoutePage } from '@console/dynamic-plugin-sdk';
import { matchPath } from 'react-router';
import camelCase from 'lodash/camelCase';

const Loader = () => (
  <Bullseye>
    <Spinner />
  </Bullseye>
);

type DynamicRouteProps = {
  location?: Location;
};

type RoutePage = {
  path: string;
  exact?: boolean;
};

const checkPath = (pathname, { path, exact }: RoutePage) => {
  const [, section] = pathname.split('/');
  return matchPath(pathname, { path, exact }) || matchPath(pathname, { path: `/${section}${path}`, exact });
};
const DynamicRoute: React.FC<DynamicRouteProps> = ({ location }) => {
  const [Component, setComponent] = React.useState<React.ExoticComponent<any>>(React.Fragment);
  const [currClassName, setCurrClassName] = React.useState<string>(null);
  const dynamicRoutePages = useExtensions<DynamicRoutePage>(isDynamicRoutePage);
  React.useEffect(() => {
    if (location) {
      const { properties: currRoute, pluginName } =
        dynamicRoutePages.find(({ properties }) => {
          if (Array.isArray(properties.path)) {
            return properties.path.some((path) => checkPath(location.pathname, { ...properties, path }));
          }
          return checkPath(location.pathname, properties as RoutePage);
        }) || {};
      if (currRoute) {
        setCurrClassName(camelCase(pluginName));
        setComponent(() =>
          React.lazy(async () => {
            try {
              return {
                default: (await currRoute.component()) || Loader,
              };
            } catch (e) {
              return {
                default: () => (
                  <Bullseye>
                    <ErrorState errorTitle={`There was an error while loading ${pluginName} plugin.`} />
                  </Bullseye>
                ),
              };
            }
          }),
        );
      }
    }
  }, [location, dynamicRoutePages]);

  return (
    <section className={currClassName || ''}>
      {Component ? (
        <React.Suspense fallback={null}>
          <Component />
        </React.Suspense>
      ) : (
        <Loader />
      )}
    </section>
  );
};

export default DynamicRoute;
